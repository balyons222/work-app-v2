import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { platformFeeRate } from '@/src/config/platformFees'
import { ACH_MAX_CENTS, ACH_REQUIRE_PRIOR_PAID_JOB } from '@/src/config/ach'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    
    // 1. Authenticate the caller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { applicationId, method } = await req.json()
    if (!applicationId) return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    const payByBank = method === 'bank'

    // 2. Fetch application and job data (User Context)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id, funding_status, status, applicant_id,
        jobs!inner ( id, rate, rate_type, estimated_hours, organizer_id, title, event_id )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // Supabase types joined rows as arrays; at runtime a many-to-one join returns a single object
    const job: any = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    // 3. Strict Status & Ownership Checks
    if (job.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this job.' }, { status: 403 })
    }
    if (['funded', 'released'].includes(application.funding_status ?? '')) {
      return NextResponse.json({ error: 'This application has already been funded.' }, { status: 400 })
    }
    if (application.funding_status === 'processing') {
      return NextResponse.json({ error: 'A bank payment for this hire is still processing. It usually clears in about 4 business days.' }, { status: 400 })
    }
    if (application.status !== 'pending' && application.status !== 'approved') {
      return NextResponse.json({ error: 'Application must be pending or approved to fund.' }, { status: 400 })
    }

    // 4. Service-Role Fetch for Contractor Profile (Bypasses RLS)
    const supabaseAdmin = createAdminClient()
    
    const { data: contractor } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id, full_name')
      .eq('id', application.applicant_id)
      .single()

    if (!contractor?.stripe_account_id) {
      return NextResponse.json({ error: 'Contractor has not connected a Stripe account.' }, { status: 400 })
    }

    // 5. Live Stripe Account Verification (Updated to include transfers capability)
    const stripeAccount = await stripe.accounts.retrieve(contractor.stripe_account_id)
    const canReceive = stripeAccount.capabilities?.transfers === 'active' && stripeAccount.payouts_enabled
    
    if (!canReceive) {
      return NextResponse.json({ 
        error: 'Cannot take payment: This contractor’s Stripe account cannot currently receive transfers and payouts.' 
      }, { status: 400 })
    }

    // 6. Safe Integer Math (Cents)
    const laborCost = job.rate_type === 'hourly' 
      ? (job.rate * (job.estimated_hours || 0)) 
      : job.rate

    const laborCents = Math.round(laborCost * 100)

    // Fee depends on the organizer's plan AT FUNDING TIME (Basic 15%, Pro Hub 10%).
    // The charged amount is stored by the webhook, so payout uses the rate actually paid.
    const { data: organizer } = await supabaseAdmin
      .from('profiles')
      .select('plan_tier, ach_enabled, ach_bank_status, ach_bank_payment_method_id, ach_bank_mandate_id')
      .eq('id', user.id)
      .single()
    const feeRate = platformFeeRate(organizer?.plan_tier)
    const feeCents = Math.round(laborCents * feeRate)
    const amountInCents = laborCents + feeCents

    if (amountInCents < 50) {
      return NextResponse.json({ error: 'Total payment must be at least $0.50' }, { status: 400 })
    }

    // ----------------------------------------------------------------
    // BANK (ACH): charge the organizer's saved, verified business account directly.
    // The hire shows "processing" until Stripe confirms the money cleared (webhook: payment_intent.*).
    // ----------------------------------------------------------------
    if (payByBank) {
      if (!organizer?.ach_enabled) {
        return NextResponse.json({ error: 'Bank payments aren’t turned on for your account. Contact support to request them.' }, { status: 403 })
      }
      if (organizer.ach_bank_status !== 'verified' || !organizer.ach_bank_payment_method_id) {
        return NextResponse.json({ error: 'Link a verified business bank account on your dashboard before paying by bank.' }, { status: 400 })
      }
      if (amountInCents > ACH_MAX_CENTS) {
        return NextResponse.json({ error: `Bank payments are limited to $${(ACH_MAX_CENTS / 100).toLocaleString()} per hire. Pay this one by card.` }, { status: 400 })
      }
      if (ACH_REQUIRE_PRIOR_PAID_JOB) {
        const { count } = await supabaseAdmin
          .from('applications')
          .select('id, jobs!inner(organizer_id)', { count: 'exact', head: true })
          .eq('jobs.organizer_id', user.id)
          .eq('payment_status', 'paid')
        if (!count) {
          return NextResponse.json({ error: 'Bank payments unlock after your first completed, paid hire. Pay this one by card.' }, { status: 400 })
        }
      }

      // Claim the application first so a double click can't start two bank payments
      const previousStatus = application.funding_status ?? null
      const claim = supabaseAdmin
        .from('applications')
        .update({ funding_status: 'processing' })
        .eq('id', application.id)
      const { data: claimed, error: claimError } = await (previousStatus
        ? claim.eq('funding_status', previousStatus)
        : claim.is('funding_status', null)
      ).select('id')
      if (claimError) throw new Error(claimError.message)
      if (!claimed || claimed.length === 0) {
        return NextResponse.json({ error: 'A payment for this hire is already in progress.' }, { status: 409 })
      }
      const releaseClaim = () => supabaseAdmin
        .from('applications')
        .update({ funding_status: previousStatus })
        .eq('id', application.id)
        .eq('funding_status', 'processing')

      try {
        const bankPm = await stripe.paymentMethods.retrieve(organizer.ach_bank_payment_method_id)
        if (!bankPm.customer) throw new Error('Your linked bank account is no longer available. Link it again.')

        const pi = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          customer: bankPm.customer as string,
          payment_method: bankPm.id,
          payment_method_types: ['us_bank_account'],
          ...(organizer.ach_bank_mandate_id ? { mandate: organizer.ach_bank_mandate_id } : {}),
          confirm: true,
          description: `Contractor payment: ${job.title} (Labor $${(laborCents / 100).toFixed(2)} + Platform Fee ${Math.round(feeRate * 100)}%)`,
          metadata: {
            application_id: application.id,
            job_id: job.id,
            organizer_id: user.id,
            contractor_id: contractor.id,
            type: 'job_escrow_funding',
            flow: 'bank_direct',
            labor_cents: String(laborCents),
            fee_cents: String(feeCents),
          },
        }, { idempotencyKey: `ach-fund-${application.id}-${previousStatus ?? 'new'}-${Date.now()}` })

        if (!['processing', 'succeeded'].includes(pi.status)) {
          await stripe.paymentIntents.cancel(pi.id).catch(() => {})
          throw new Error('The bank payment couldn’t be started. Try again or pay by card.')
        }

        await supabaseAdmin
          .from('applications')
          .update({ stripe_payment_intent_id: pi.id })
          .eq('id', application.id)

        return NextResponse.json({ bank: true, status: 'processing' })
      } catch (err) {
        await releaseClaim()
        throw err
      }
    }

    // 7. Environment & Unified URL Configuration (Trailing slash fixed)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl && process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_SITE_URL environment variable is missing in production.')
    }
    const baseUrl = siteUrl?.replace(/\/$/, '') || 'http://localhost:3000'
    
    const successUrl = `${baseUrl}/dashboard/event/${job.event_id}?funded=true`
    const cancelUrl = `${baseUrl}/dashboard/event/${job.event_id}?funded=cancelled`

    // 8. Create the Stripe Checkout Session (Expires in 30 mins, idempotency key removed)
    const session = await stripe.checkout.sessions.create({
      // Card only. Bank (ACH) payments go through the organizer's saved, verified business account (above).
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Contractor payment: ${job.title}`,
              description: `Labor: $${(laborCents / 100).toFixed(2)} + Platform Fee (${Math.round(feeRate * 100)}%): $${(feeCents / 100).toFixed(2)}\nContractor: ${contractor.full_name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: application.id,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expires in 30 minutes
      metadata: {
        application_id: application.id,
        job_id: job.id,
        organizer_id: user.id,
        contractor_id: contractor.id,
        type: 'job_escrow_funding',
        labor_cents: String(laborCents),
        fee_cents: String(feeCents)
      }
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Funding Error:', error.message)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
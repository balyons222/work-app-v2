import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLATFORM_FEE_PERCENT = 0.10 // 10% fee

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { applicationId } = await req.json()

    // 1. Fetch application, escrow status, and contractor details
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        applicant_id,
        funding_status,
        payment_status,
        stripe_payment_intent_id,
        profiles:applicant_id ( id, stripe_account_id, payouts_enabled ),
        jobs ( id, title, rate, rate_type, estimated_hours, events ( organizer_id ) )
      `)
      .eq('id', applicationId)
      .single()

    if (error || !data) throw new Error('Application not found')
    const app = data as any
    const job = app.jobs
    const contractor = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles

    if (job.events.organizer_id !== user.id) {
      throw new Error('Unauthorized: You are not the organizer for this gig')
    }
    if (app.funding_status !== 'funded') {
      throw new Error('This gig has not been funded into escrow yet.')
    }
    if (app.payment_status === 'paid') {
      throw new Error('Funds have already been released for this gig.')
    }
    if (!contractor?.stripe_account_id || !contractor?.payouts_enabled) {
      throw new Error('Contractor has not connected their bank account.')
    }

    // 2. Calculations
    const contractorGross = job.rate_type === 'hourly'
      ? (job.rate * (job.estimated_hours || 0))
      : job.rate

    const contractorPayoutCents = Math.round(contractorGross * 100)
    const platformFee = contractorGross * PLATFORM_FEE_PERCENT

    // 3. Transfer 100% of the contractor's wage to their account
    const transfer = await stripe.transfers.create({
      amount: contractorPayoutCents,
      currency: 'usd',
      destination: contractor.stripe_account_id,
      description: `Payout for ${job.title}`,
    })

    // 4. Mark application as paid and write to ledger
    await supabaseAdmin
      .from('applications')
      .update({
        payment_status: 'paid',
        funding_status: 'released',
        payment_method: 'Stripe Escrow Release',
      })
      .eq('id', app.id)

    await supabaseAdmin
      .from('payouts')
      .insert({
        application_id: app.id,
        job_id: job.id,
        contractor_id: contractor.id,
        organizer_id: user.id,
        stripe_payment_intent_id: app.stripe_payment_intent_id,
        stripe_transfer_id: transfer.id,
        gross_amount: contractorGross + platformFee, // Total paid by organizer
        platform_fee: platformFee,                   // Fee retained by platform
        net_amount: contractorGross,                 // Payout received by contractor (100%)
        status: 'completed',
      })

    return NextResponse.json({ success: true, transferId: transfer.id })
  } catch (err: any) {
    console.error('Release Escrow Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
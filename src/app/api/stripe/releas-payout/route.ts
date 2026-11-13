import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/src/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Using the pinned API version from the webhook for consistency
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover' as any,
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    
    // 1. Authenticate the caller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { applicationId } = await req.json()
    if (!applicationId) return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })

    // 2. Fetch the Application and Job Data
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id, funding_status, payment_status, actual_hours, stripe_charge_id, funded_labor_cents, applicant_id,
        jobs!inner ( id, rate, rate_type, organizer_id )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // 3. Strict Security & Status Checks
    if (application.jobs.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this job.' }, { status: 403 })
    }
    if (application.funding_status !== 'funded') {
      return NextResponse.json({ error: 'Cannot release: Escrow has not been funded yet.' }, { status: 400 })
    }
    if (application.payment_status === 'paid') {
      return NextResponse.json({ error: 'This contractor has already been paid.' }, { status: 400 })
    }
    if (!application.stripe_charge_id) {
      return NextResponse.json({ error: 'Critical: No escrow charge ID found to release funds from.' }, { status: 400 })
    }
    if (!application.funded_labor_cents) {
      return NextResponse.json({ error: 'Critical: Original funded amount record is missing.' }, { status: 400 })
    }

    // 4. Secure Server-Side Math (Using original funded amounts, not live job rates)
    const fundedLaborCents = application.funded_labor_cents
    
    let payoutCents = fundedLaborCents
    if (application.jobs.rate_type === 'hourly') {
      const actualHours = parseFloat(application.actual_hours)
      if (isNaN(actualHours) || actualHours <= 0) {
        return NextResponse.json({ error: 'Valid actual hours must be logged before releasing an hourly payout.' }, { status: 400 })
      }
      // Calculate exact payout based on live rate * actual hours
      payoutCents = Math.round(application.jobs.rate * actualHours * 100)
    }

    if (payoutCents <= 0) {
      return NextResponse.json({ error: 'Payout amount must be greater than zero.' }, { status: 400 })
    }

    // 5. Overtime Guard
    if (payoutCents > fundedLaborCents) {
      return NextResponse.json({ 
        error: 'Overtime detected. The actual hours logged exceed the estimated escrow amount. A secondary charge is required to cover the difference.',
        code: 'OVERTIME_EXCEEDS_ESCROW'
      }, { status: 400 })
    }

    // 6. Fetch Contractor's Stripe ID and check live status
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: contractor } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', application.applicant_id)
      .single()

    if (!contractor?.stripe_account_id) {
      return NextResponse.json({ error: 'Contractor is missing a Stripe Connect account.' }, { status: 400 })
    }

    const stripeAccount = await stripe.accounts.retrieve(contractor.stripe_account_id)
    if (stripeAccount.capabilities?.transfers !== 'active' || !stripeAccount.payouts_enabled) {
      return NextResponse.json({ error: 'Contractor must update their Stripe info. Their account is restricted from receiving transfers.' }, { status: 400 })
    }

    // 7. Execute the Idempotent Transfer
    const transferGroup = `application_${application.id}`
    let transferId: string

    // Check if we already created a transfer for this application (handles double-clicks safely)
    const existingTransfers = await stripe.transfers.list({ transfer_group: transferGroup, limit: 1 })
    
    if (existingTransfers.data.length > 0) {
      transferId = existingTransfers.data[0].id
    } else {
      const transfer = await stripe.transfers.create({
        amount: payoutCents,
        currency: 'usd',
        destination: contractor.stripe_account_id,
        source_transaction: application.stripe_charge_id, 
        transfer_group: transferGroup,
        metadata: {
          application_id: application.id,
          job_id: application.jobs.id
        }
      }, {
        idempotencyKey: `release-${application.id}` // Prevents double-charging
      })
      transferId = transfer.id
    }

    // 8. Handle Unused Escrow Refund (If hourly worker worked fewer hours)
    const unusedCents = fundedLaborCents - payoutCents
    if (unusedCents > 0) {
      try {
        await stripe.refunds.create({
          charge: application.stripe_charge_id,
          amount: unusedCents,
          metadata: { application_id: application.id, type: 'unused_escrow_refund' }
        }, {
          idempotencyKey: `refund-unused-${application.id}`
        })
      } catch (refundErr) {
        console.error('Non-fatal: Failed to refund unused escrow to organizer:', refundErr)
        // We log this but don't fail the contractor's payout
      }
    }

    // 9. Update DB to Mark as Paid
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        payment_status: 'paid',
        stripe_transfer_id: transferId
      })
      .eq('id', application.id)
      .neq('payment_status', 'paid') // Extra safety to prevent clobbering

    if (updateError) {
      console.error('CRITICAL: Transfer sent but DB not updated', { applicationId: application.id, transferId }, updateError)
      return NextResponse.json({ 
        error: 'Payout sent successfully, but our database update failed. Click release again to finish syncing the status.', 
        transferId 
      }, { status: 500 }) // 500 forces UI to see an error, but idempotency makes clicking again safe
    }

    return NextResponse.json({ success: true, transferId })

  } catch (err: any) {
    console.error('Payout Release Error:', err)
    // Never return the raw Stripe error string to the frontend (security risk)
    return NextResponse.json({ error: 'An unexpected error occurred while processing the payout.' }, { status: 500 })
  }
}
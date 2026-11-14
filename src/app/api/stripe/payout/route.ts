import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, // Keep aligned with fund-job + webhook
})

const supabaseAdmin = createAdminClient()

// Rows funded before funded_amount_cents/funded_labor_cents were recorded all used the old flat 10% fee
const LEGACY_FEE_RATE = 0.10

// Errors safe to show the organizer (anything else gets a generic message)
class PayoutError extends Error {
  constructor(message: string, public status = 400, public code?: string) { super(message) }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new PayoutError('Unauthorized', 401)

    const { applicationId } = await req.json()
    if (!applicationId) throw new PayoutError('Application ID is required')

    // 1. Fetch application, escrow record, and job
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select(`
        id, applicant_id, status, funding_status, payment_status, actual_hours,
        stripe_payment_intent_id, stripe_charge_id, funded_labor_cents, funded_amount_cents,
        jobs ( id, title, rate, rate_type, estimated_hours, organizer_id, events ( title ) )
      `)
      .eq('id', applicationId)
      .single()

    if (error || !data) throw new PayoutError('Application not found', 404)
    const app = data as any
    const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs
    const eventTitle = (Array.isArray(job?.events) ? job.events[0] : job?.events)?.title || 'your event'

    // 2. Ownership & state checks
    if (!job || job.organizer_id !== user.id) throw new PayoutError('Forbidden. You do not own this job.', 403)
    if (app.payment_status === 'paid') throw new PayoutError('This contractor has already been paid.')
    if (app.funding_status !== 'funded') throw new PayoutError('Cannot release: escrow has not been funded.')
    if (app.status !== 'approved') throw new PayoutError('Only approved (hired) applications can be paid out.')

    // 3. Resolve the escrow charge (older rows may predate stripe_charge_id being stored)
    let chargeId: string | null = app.stripe_charge_id
    if (!chargeId && app.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(app.stripe_payment_intent_id)
      chargeId = (pi.latest_charge as string) || null
    }
    if (!chargeId) throw new PayoutError('No escrow charge found for this application. Please contact support.')

    // 4. What was actually funded. Never trust the live job rate/hours for the cap.
    let fundedLaborCents: number = app.funded_labor_cents
    if (!fundedLaborCents) {
      // Legacy rows funded before funded_labor_cents was recorded: derive from the charge (labor + 10% fee)
      const charge = await stripe.charges.retrieve(chargeId)
      fundedLaborCents = Math.round(charge.amount / (1 + LEGACY_FEE_RATE))
    }

    // 5. Payout amount
    let payoutCents = fundedLaborCents
    if (job.rate_type === 'hourly') {
      const actualHours = parseFloat(app.actual_hours)
      if (!Number.isFinite(actualHours) || actualHours <= 0) {
        throw new PayoutError('Log actual hours before releasing an hourly payout.')
      }
      payoutCents = Math.round(job.rate * actualHours * 100)
    }
    if (payoutCents <= 0) throw new PayoutError('Payout amount must be greater than zero.')
    if (payoutCents > fundedLaborCents) {
      throw new PayoutError(
        'The logged hours exceed the funded escrow. Reduce the hours to the funded amount or fund the difference separately.',
        400, 'OVERTIME_EXCEEDS_ESCROW'
      )
    }

    // 6. Contractor account must be live
    const { data: contractor } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id, email, full_name')
      .eq('id', app.applicant_id)
      .single()

    if (!contractor?.stripe_account_id) throw new PayoutError('Contractor has not connected a Stripe account.')
    const account = await stripe.accounts.retrieve(contractor.stripe_account_id)
    if (account.capabilities?.transfers !== 'active' || !account.payouts_enabled) {
      throw new PayoutError('Contractor’s Stripe account cannot receive transfers right now. Ask them to update their payout details.')
    }

    // 7. Transfer: reuse an existing one for this application (double-click / retry safe), else create
    //    with an idempotency key so concurrent requests produce exactly one transfer.
    const transferGroup = `application_${app.id}`
    const existing = await stripe.transfers.list({ transfer_group: transferGroup, limit: 1 })
    const transfer = existing.data[0] ?? await stripe.transfers.create({
      amount: payoutCents,
      currency: 'usd',
      destination: contractor.stripe_account_id,
      source_transaction: chargeId, // Ties funds to the escrow charge, so it works before the balance settles
      transfer_group: transferGroup,
      description: `Payout for ${job.title}`,
      metadata: { application_id: app.id, job_id: job.id },
    }, { idempotencyKey: `release-${app.id}` })

    // Use the amount that actually moved (matters if an earlier transfer was reused)
    payoutCents = transfer.amount

    // 8. Mark paid. Conditional on not already paid, so concurrent requests don't double-process side effects.
    const { data: marked, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        payment_status: 'paid',
        funding_status: 'released',
        payment_method: 'Stripe Escrow Release',
        stripe_transfer_id: transfer.id,
      })
      .eq('id', app.id)
      .neq('payment_status', 'paid')
      .select('id')

    if (updateError) {
      console.error('CRITICAL: Transfer sent but DB not updated', { applicationId: app.id, transferId: transfer.id }, updateError)
      return NextResponse.json({
        error: 'Payout was sent, but saving its status failed. Click Release again to finish. It will not pay twice.',
        transferId: transfer.id,
      }, { status: 500 })
    }

    // Another request already finished this payout; skip the refund, ledger and email
    if (!marked || marked.length === 0) {
      return NextResponse.json({ success: true, transferId: transfer.id })
    }

    // 9. Refund unused escrow to the organizer (hourly jobs that came in under estimate):
    //    the unused labor PLUS the platform fee charged on that unused labor.
    //    Fee charged at funding = Basic 15% / Pro Hub 10%, fixed when funded.
    const fundedFeeCents = app.funded_amount_cents && app.funded_labor_cents
      ? app.funded_amount_cents - app.funded_labor_cents
      : Math.round(fundedLaborCents * LEGACY_FEE_RATE)
    const unusedLaborCents = fundedLaborCents - payoutCents
    const unusedFeeCents = unusedLaborCents > 0
      ? Math.round(fundedFeeCents * unusedLaborCents / fundedLaborCents)
      : 0
    const refundCents = unusedLaborCents + unusedFeeCents

    if (refundCents > 0) {
      try {
        await stripe.refunds.create({
          charge: chargeId,
          amount: refundCents,
          metadata: {
            application_id: app.id,
            type: 'unused_escrow_refund',
            unused_labor_cents: String(unusedLaborCents),
            unused_fee_cents: String(unusedFeeCents),
          },
        }, { idempotencyKey: `refund-unused-${app.id}` })
      } catch (refundErr: any) {
        // Don't fail the contractor's payout, but this needs manual follow-up
        console.error('CRITICAL: Unused escrow refund failed — refund manually', { applicationId: app.id, chargeId, refundCents }, refundErr.message)
      }
    }

    // 10. Ledger: the fee the platform keeps is the fee on labor actually paid out
    const platformFeeCents = fundedFeeCents - unusedFeeCents
    const { error: ledgerError } = await supabaseAdmin.from('payouts').insert({
      application_id: app.id,
      job_id: job.id,
      contractor_id: contractor.id,
      organizer_id: user.id,
      stripe_payment_intent_id: app.stripe_payment_intent_id,
      stripe_transfer_id: transfer.id,
      gross_amount: (payoutCents + platformFeeCents) / 100, // Labor paid out + fee retained
      platform_fee: platformFeeCents / 100,
      net_amount: payoutCents / 100,                       // Received by contractor
      status: 'completed',
    })
    if (ledgerError) console.error('Payout ledger insert failed', { applicationId: app.id, transferId: transfer.id }, ledgerError.message)

    // 11. "You got paid" email (failure never affects the payout response)
    if (contractor.email) {
      try {
        const firstName = escapeHtml(contractor.full_name?.split(' ')[0] || 'there')
        await resend.emails.send({
          from: 'FxD Events <hello@fxdevents.com>',
          to: contractor.email,
          subject: `You just got paid for ${job.title}! 💸`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
              <h2 style="color: #4f46e5;">Payment Released! 🎉</h2>
              <p>Hi ${firstName},</p>
              <p>Great news! The organizer has released the escrow funds for your work at <strong>${escapeHtml(eventTitle)}</strong>.</p>
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold;">Amount Transferred</p>
                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: #0f172a;">$${(payoutCents / 100).toFixed(2)}</p>
              </div>
              <p>The funds are on their way to your connected bank account via Stripe. Transfers typically take 1-2 business days to appear depending on your bank.</p>
              <p>Keep up the great work!</p>
              <p><strong>The FxD Events Team</strong></p>
            </div>
          `,
        })
      } catch (emailErr) {
        console.error('Payout email failed (payout succeeded):', emailErr)
      }
    }

    return NextResponse.json({ success: true, transferId: transfer.id })
  } catch (err: any) {
    if (err instanceof PayoutError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    console.error('Payout Release Error:', err)
    // Don't leak raw Stripe/DB errors to the client
    return NextResponse.json({ error: 'An unexpected error occurred while processing the payout.' }, { status: 500 })
  }
}

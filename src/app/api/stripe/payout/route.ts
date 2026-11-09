import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
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
       profiles:applicant_id ( id, stripe_account_id, payouts_enabled, email, full_name ),
  jobs ( id, title, rate, rate_type, estimated_hours, events ( organizer_id, title ) )
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
// 5. Send the "You got paid" email!
// We wrap this in its own try/catch so an email error doesn't break the payout success response
try {
  await resend.emails.send({
    from: 'FxD Events <hello@fxdevents.com>', // MUST match your verified Resend domain
    to: contractor.email,
    subject: `You just got paid for ${job.title}! 💸`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
        <h2 style="color: #4f46e5;">Payment Released! 🎉</h2>
        <p>Hi ${contractor.full_name?.split(' ')[0] || 'there'},</p>
        <p>Great news! The organizer has released the escrow funds for your work at <strong>${job.events.title}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold;">Amount Transferred</p>
          <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: #0f172a;">$${contractorGross.toFixed(2)}</p>
        </div>

        <p>The funds are now on their way to your connected bank account via Stripe. Transfers typically take 1-2 business days to appear depending on your bank.</p>
        
        <p>Keep up the great work!</p>
        <p><strong>The FxD Events Team</strong></p>
      </div>
    `
  })
  console.log(`📧 Payout email successfully sent to ${contractor.email}`)
} catch (emailErr) {
  console.error('❌ Email failed to send, but payout succeeded:', emailErr)
}
    return NextResponse.json({ success: true, transferId: transfer.id })
  } catch (err: any) {
    console.error('Release Escrow Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { applicationId } = await req.json()

    // 1. Fetch application, job rate, and contractor's Stripe ID
    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        id, 
        applicant_id,
        status,
        payment_status,
        profiles:applicant_id ( stripe_account_id, payouts_enabled ),
        jobs ( rate, rate_type, estimated_hours )
      `)
      .eq('id', applicationId)
      .single()

    if (error || !application) throw new Error('Application not found')
    if (application.payment_status === 'paid') throw new Error('Already paid')
    if (!application.profiles?.stripe_account_id || !application.profiles?.payouts_enabled) {
      throw new Error('Contractor has not connected their bank account yet.')
    }

    // 2. Calculate final payout amount (Stripe expects cents)
    const job = application.jobs
    const totalAmount = job.rate_type === 'hourly' 
      ? (job.rate * (job.estimated_hours || 0)) 
      : job.rate
    const amountInCents = Math.round(totalAmount * 100)

    // 3. Trigger the Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: application.profiles.stripe_account_id,
      description: `Payout for Job ID: ${job.id}`,
    })

    // 4. Mark as paid in your database
    await supabase
      .from('applications')
      .update({ payment_status: 'paid', payment_method: 'Stripe Transfer' })
      .eq('id', applicationId)

    return NextResponse.json({ success: true, transferId: transfer.id })

  } catch (error: any) {
    console.error('Payout Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
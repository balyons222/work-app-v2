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
    // ✅ FIX 1: Added 'id' to the jobs select string
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, 
        applicant_id,
        status,
        payment_status,
        profiles:applicant_id ( stripe_account_id, payouts_enabled ),
        jobs ( id, rate, rate_type, estimated_hours )
      `)
      .eq('id', applicationId)
      .single()

    if (error || !data) throw new Error('Application not found')

    // ✅ FIX 2: Cast to 'any' to resolve TypeScript errors on joined tables
    const application = data as any

    // ✅ FIX 3: Safely handle if Supabase returns arrays for joined tables
    const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles
    const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs

    if (application.payment_status === 'paid') throw new Error('Already paid')
    if (!profile?.stripe_account_id || !profile?.payouts_enabled) {
      throw new Error('Contractor has not connected their bank account yet.')
    }

    // 2. Calculate final payout amount (Stripe expects cents)
    const totalAmount = job.rate_type === 'hourly' 
      ? (job.rate * (job.estimated_hours || 0)) 
      : job.rate
    const amountInCents = Math.round(totalAmount * 100)

    // 3. Trigger the Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: profile.stripe_account_id,
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
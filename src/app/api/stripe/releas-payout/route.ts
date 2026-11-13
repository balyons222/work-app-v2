import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/src/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { applicationId } = await req.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    // 1. Fetch the application, job, and contractor details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id, 
        payment_status,
        jobs!inner ( id, rate, organizer_id, title ),
        profiles:applicant_id ( id, stripe_account_id, payouts_enabled, full_name )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // 2. Security Check: Only the organizer who created the job can release the funds
    if (application.jobs.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this job.' }, { status: 403 })
    }

    if (application.payment_status?.toLowerCase() === 'paid') {
      return NextResponse.json({ error: 'This contractor has already been paid.' }, { status: 400 })
    }

    const contractor = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles

    if (!contractor?.stripe_account_id || !contractor.payouts_enabled) {
      return NextResponse.json({ 
        error: 'Contractor has not fully onboarded their bank account with Stripe yet.' 
      }, { status: 400 })
    }

    // 3. Calculate amount in cents (Stripe requires smallest currency unit)
    const amountInCents = Math.round(application.jobs.rate * 100)

    // 4. Execute the Stripe Transfer to the Contractor's Connect Account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: contractor.stripe_account_id,
      metadata: {
        application_id: application.id,
        job_id: application.jobs.id,
      },
      // Optional but recommended: tie it to the original payment intent 
      // if you stored it on the application during hiring
      // source_transaction: application.stripe_payment_intent_id 
    })

    // 5. Mark as Paid in your database
    const { error: updateError } = await supabase
      .from('applications')
      .update({ 
        payment_status: 'paid',
        stripe_transfer_id: transfer.id 
      })
      .eq('id', application.id)

    if (updateError) {
      console.error('Failed to update DB after transfer:', updateError)
      // Note: The money transferred, but DB failed. You should log this critically.
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Payout Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
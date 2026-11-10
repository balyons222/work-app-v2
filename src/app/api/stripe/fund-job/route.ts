import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { applicationId } = await req.json()
    if (!applicationId) return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })

    // 1. Fetch Organizer's Profile to check their tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier')
      .eq('id', user.id)
      .single()

    // Determine tier and dynamic fee (15% for basic, 8% for pro)
    // Adjust 'organizer_pro' to match whatever string you save to the DB for upgraded organizers
    const isPro = profile?.plan_tier === 'organizer_pro' 
    const dynamicFeePercent = isPro ? 0.08 : 0.15 

    // 2. Fetch application, job rate, and event ownership
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        applicant_id,
        status,
        funding_status,
        jobs (
          id,
          title,
          rate,
          rate_type,
          estimated_hours,
          event_id,
          events ( organizer_id, title )
        )
      `)
      .eq('id', applicationId)
      .single()

    if (error || !data) throw new Error('Application record not found')

    const app = data as any
    const job = app.jobs
    const event = job.events

    // Verify current user owns this event
    if (event.organizer_id !== user.id) {
      throw new Error('Unauthorized: You do not own this event')
    }

    if (app.funding_status === 'funded') {
      throw new Error('This position has already been funded into escrow.')
    }

    // 3. Calculate contractor labor amount and dynamic platform fee
    const contractorGross = job.rate_type === 'hourly'
      ? (job.rate * (job.estimated_hours || 0))
      : job.rate

    const contractorGrossCents = Math.round(contractorGross * 100)
    const platformFeeCents = Math.round(contractorGrossCents * dynamicFeePercent)

    // 4. Create Stripe-hosted Checkout Session
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: contractorGrossCents,
            product_data: {
              name: `Labor Escrow: ${job.title}`,
              description: `Escrow hold for ${event.title}. Released upon gig completion.`,
            },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            unit_amount: platformFeeCents,
            product_data: {
              // Dynamically display the percentage they are paying based on their tier
              name: `Platform Service Fee (${dynamicFeePercent * 100}%)`,
              description: 'Marketplace coordination, escrow protection, and support.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        application_id: app.id,
        job_id: job.id,
        organizer_id: user.id,
        contractor_id: app.applicant_id,
        type: 'job_escrow_funding',
      },
      success_url: `${origin}/dashboard/event/${job.event_id}?funded=true`,
      cancel_url: `${origin}/dashboard/event/${job.event_id}?funded=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe Escrow Fund Error]:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
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

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    // 1. ADD targetRole HERE to receive it from your frontend buttons
    const { priceId, targetRole } = body 

    const { data: profile } = await supabase
      .from('my_profile')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true, 
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fxdevents.com'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fxdevents.com'}/dashboard`,
      client_reference_id: user.id,
      // 2. ADD THIS METADATA BLOCK to pass the tier to your webhook
      metadata: {
        purchased_tier: targetRole 
      }
    }

    if (profile?.stripe_customer_id) {
      sessionConfig.customer = profile.stripe_customer_id
    } else {
      sessionConfig.customer_email = user.email
    }

    console.log("🔑 ACTUAL STRIPE KEY:", process.env.STRIPE_SECRET_KEY?.substring(0, 14) + "...");
    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
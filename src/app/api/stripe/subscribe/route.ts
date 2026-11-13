import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { tierForPrice } from '@/src/config/stripePrices'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only the price is taken from the client; the tier is derived from it server-side.
    // (Any `tierName` the browser sends is ignored.)
    const { priceId } = await req.json()
    const tier = tierForPrice(priceId)
    if (!tier) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    // Avoid a second, parallel subscription: plan changes/cancellation go through the billing portal
    if (profile?.stripe_subscription_id) {
      return NextResponse.json({
        error: 'You already have an active subscription. Use "Manage Subscription" on your dashboard to change plans.',
      }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: user.id, // Tells the webhook who bought this
      // Reuse the existing Stripe customer so billing history stays in one place
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      // Informational only — the webhook re-derives the tier from the price actually paid
      metadata: { plan_tier: tier },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Subscribe error:', error.message)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }
}

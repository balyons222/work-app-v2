import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover',
})

// 2. Initialize Supabase Admin (Bypasses Row Level Security for server-to-server updates)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string 
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    // Verify the webhook is actually from Stripe and not a hacker
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // Handle the successful checkout event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Retrieve the user ID we passed during checkout
    const userId = session.client_reference_id
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    if (userId) {
      // Update the user's profile to premium
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_tier: 'premium',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user subscription:', error)
        return new NextResponse('Database Update Error', { status: 500 })
      }
    }
  }

  // Handle subscription cancellations
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    
    // Find the user by their Stripe customer ID and downgrade them to free
    await supabaseAdmin
      .from('profiles')
      .update({ 
        plan_tier: 'free',
        stripe_subscription_id: null 
      })
      .eq('stripe_customer_id', subscription.customer as string)
  }

  return new NextResponse('Webhook processed successfully', { status: 200 })
}
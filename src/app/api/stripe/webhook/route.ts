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
    console.log('🔔 1. WEBHOOK RECEIVED: checkout.session.completed')
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.client_reference_id
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    console.log('👤 2. USER ID FROM STRIPE:', userId)
    console.log('💳 3. CUSTOMER ID:', customerId)

    if (userId) {
      console.log('🗄️ 4. ATTEMPTING SUPABASE UPDATE...')
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_tier: 'premium',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', userId)
        .select() // Forces Supabase to return the updated row

      if (error) {
        console.error('❌ 5. SUPABASE ERROR:', error)
        return new NextResponse('Database Update Error', { status: 500 })
      }
      
      console.log('✅ 6. SUPABASE UPDATE SUCCESS! Rows affected:', data?.length)
    } else {
      console.log('⚠️ 4. NO USER ID FOUND - SKIPPING DATABASE UPDATE')
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
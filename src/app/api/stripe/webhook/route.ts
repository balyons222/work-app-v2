import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover', 
})

// 2. Initialize Supabase Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string 
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    // Note: If you run into Connect webhook issues locally, 
    // remember you may need a try/catch here with STRIPE_CONNECT_WEBHOOK_SECRET
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error: any) {
    console.error(`❌ Webhook Error: ${error.message}`)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // ========================================================
  // EVENT: CHECKOUT COMPLETED (Escrow OR Subscription)
  // ========================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // SCENARIO A: ORGANIZER FUNDING ESCROW
    if (session.metadata?.type === 'job_escrow_funding') {
      console.log('💰 ESCROW FUNDED FOR APPLICATION:', session.metadata.application_id)
      
      const { error } = await supabaseAdmin
        .from('applications')
        .update({
          status: 'approved',
          funding_status: 'funded',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', session.metadata.application_id)

      if (error) {
        console.error('❌ Database update failed:', error)
        return new NextResponse('Database error', { status: 500 })
      }
      return new NextResponse('Escrow funded successfully', { status: 200 })
    }

    // SCENARIO B: USER BUYING PRO SUBSCRIPTION
    else if (session.mode === 'subscription' && session.client_reference_id) {
      console.log('🚀 PRO SUBSCRIPTION PURCHASED')
      const userId = session.client_reference_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const tier = session.metadata?.plan_tier || 'contractor'

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          plan_tier: tier,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId
        })
        .eq('id', userId)
        
      if (error) {
        console.error('❌ Subscription DB Update Error:', error)
        return new NextResponse('Database Error', { status: 500 })
      }
      return new NextResponse('Subscription activated successfully', { status: 200 })
    }
  }

  // ========================================================
  // EVENT: SUBSCRIPTION CANCELED
  // ========================================================
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    console.log('🗑️ WEBHOOK RECEIVED: customer.subscription.deleted')
    
    await supabaseAdmin
      .from('profiles')
      .update({ 
        plan_tier: 'basic',
        stripe_subscription_id: null 
      })
      .eq('stripe_customer_id', subscription.customer as string)
  }

  // ========================================================
  // EVENT: CONNECT ACCOUNT ONBOARDED
  // ========================================================
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    console.log(`🏦 Connect Account ${account.id} payouts_enabled set to: ${account.payouts_enabled}`)

    await supabaseAdmin
      .from('profiles')
      .update({ payouts_enabled: account.payouts_enabled })
      .eq('stripe_account_id', account.id)
  }

  return new NextResponse('Webhook processed successfully', { status: 200 })
}
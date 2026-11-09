import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover', // Ensure this matches your installed version
})

// 2. Initialize Supabase Admin (Bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string 
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error: any) {
    console.error(`❌ Webhook Error: ${error.message}`)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    console.log('🔔 1. WEBHOOK RECEIVED: checkout.session.completed')
    const session = event.data.object as Stripe.Checkout.Session
if (session.metadata?.type === 'job_escrow_funding') {
      const applicationId = session.metadata.application_id
      const paymentIntentId = session.payment_intent as string
      
      console.log(`💰 ESCROW FUNDED FOR APPLICATION: ${applicationId}`)

      const { error } = await supabaseAdmin
        .from('applications')
        .update({
          status: 'approved',
          funding_status: 'funded',
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq('id', applicationId)

      if (error) {
        console.error('❌ Database update failed:', error)
        return new NextResponse('Database error', { status: 500 })
      }
      
      console.log('✅ Escrow database update successful!')
      return new NextResponse('Escrow funded successfully', { status: 200 })
    }
    const userId = session.client_reference_id
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    
    const purchasedTier = session.metadata?.purchased_tier || 'basic'

    console.log('👤 2. USER ID FROM STRIPE:', userId)
    console.log('💳 3. CUSTOMER ID:', customerId)
    console.log('🏷️ 4. PURCHASED TIER:', purchasedTier)

    if (userId) {
      console.log('🗄️ 5. ATTEMPTING SUPABASE UPDATE...')
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_tier: purchasedTier, 
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', userId)
        .select() 

      if (error) {
        console.error('❌ 6. SUPABASE ERROR:', error)
        return new NextResponse('Database Update Error', { status: 500 })
      }
      
      console.log('✅ 7. SUPABASE UPDATE SUCCESS! Rows affected:', data?.length)
    } else {
      console.log('⚠️ 5. NO USER ID FOUND - SKIPPING DATABASE UPDATE')
    }
  }

  // Handle subscription cancellations
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    
    console.log('🗑️ WEBHOOK RECEIVED: customer.subscription.deleted')
    
    // Downgrade them to the free tier ('basic')
    await supabaseAdmin
      .from('profiles')
      .update({ 
        plan_tier: 'basic',
        stripe_subscription_id: null 
      })
      .eq('stripe_customer_id', subscription.customer as string)
  }

  // ✅ PASTE THE NEW CONNECT ACCOUNT BLOCK HERE:
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const payoutsEnabled = account.payouts_enabled

    console.log('🏦 WEBHOOK RECEIVED: account.updated')

    // Update the profile based on the connected account's status
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ payouts_enabled: payoutsEnabled })
      .eq('stripe_account_id', account.id)

    if (error) {
      console.error('🚨 Error updating connect account status:', error)
      return new NextResponse('Database Error', { status: 500 })
    }

    console.log(`🏦 Connect Account ${account.id} payouts_enabled set to: ${payoutsEnabled}`)
  }

  return new NextResponse('Webhook processed successfully', { status: 200 })
}
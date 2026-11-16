import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover' as any,
})

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('my_profile')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Portal: profile lookup failed:', profileError.message)
      return NextResponse.json({ error: 'Could not load your billing account.' }, { status: 500 })
    }

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account is linked to your profile. Please contact support.' },
        { status: 404 }
      )
    }

    const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${base}/dashboard`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    // Most common: portal not configured in this Stripe mode, or a test-mode customer with a live key
    console.error('Portal error:', error?.message)
    return NextResponse.json(
      { error: 'Billing portal is temporarily unavailable. Please contact support.' },
      { status: 500 }
    )
  }
}

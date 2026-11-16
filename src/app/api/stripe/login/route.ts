import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover' as any,
})

// One-time link into the contractor's own Stripe Express dashboard (balance, payouts, tax forms).
// Always opens the account saved on the caller's profile, so it never shows a stray duplicate.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

    const { data: profile } = await createAdminClient()
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: 'Set up payouts first.' }, { status: 404 })
    }

    const link = await stripe.accounts.createLoginLink(profile.stripe_account_id)
    return NextResponse.json({ url: link.url })
  } catch (error: any) {
    console.error('Stripe login link error:', error?.message)
    const msg = error?.code === 'resource_missing'
      ? 'Your payout account needs to be set up again. Please contact support.'
      : 'Could not open your Stripe dashboard. If you haven’t finished payout setup, please complete it first.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

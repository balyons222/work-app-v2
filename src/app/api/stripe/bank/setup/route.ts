import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { ACH_TERMS_VERSION } from '@/src/config/ach'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

// Starts linking a business bank account for ACH hire payments (Stripe Checkout in setup mode:
// nothing is charged). Only organizers an admin has switched on can start it.
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { acceptTerms } = await req.json().catch(() => ({}))
    if (acceptTerms !== true) {
      return NextResponse.json({ error: 'Please accept the bank payment terms first.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, ach_enabled, stripe_customer_id, full_name, company_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'organizer') {
      return NextResponse.json({ error: 'Only organizers can link a bank account for payments.' }, { status: 403 })
    }
    if (!profile.ach_enabled) {
      return NextResponse.json({ error: 'Bank payments aren’t turned on for your account. Contact support to request them.' }, { status: 403 })
    }

    // Reuse the saved Stripe customer only if it exists for this key's mode (test vs live)
    let customerId: string | null = profile.stripe_customer_id ?? null
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId)
        if ((existing as Stripe.DeletedCustomer).deleted) customerId = null
      } catch (err: any) {
        if (err?.code === 'resource_missing') customerId = null
        else throw err
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.company_name || profile.full_name || undefined,
        metadata: { user_id: user.id },
      }, { idempotencyKey: `customer-${user.id}-${profile.stripe_customer_id ?? 'none'}` })
      customerId = customer.id
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Record agreement to the bank payment terms (chargeback responsibility, business accounts only)
    await admin.from('profiles').update({ ach_terms_accepted_at: new Date().toISOString() }).eq('id', user.id)

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.headers.get('origin') || 'http://localhost:3000'

    const createSession = (withOwnership: boolean) => stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId!,
      currency: 'usd',
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          // Instant verification through the bank's login (no manual entry / microdeposits), so the
          // account comes with its holder type and, once approved, owner names.
          verification_method: 'instant',
          financial_connections: withOwnership
            ? { permissions: ['payment_method', 'ownership'], prefetch: ['ownership'] }
            : { permissions: ['payment_method'] },
        },
      },
      success_url: `${origin}/dashboard?bank=linked&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?bank=cancelled`,
      metadata: { type: 'org_bank_setup', user_id: user.id, terms_version: ACH_TERMS_VERSION },
    } as Stripe.Checkout.SessionCreateParams)

    // Ownership data needs Stripe's approval (Dashboard → settings/financial-connections). Until it's
    // granted, link without it: the account is still checked as business vs. personal, and goes to
    // admin review instead of auto-verifying (no owner names to compare).
    let session: Stripe.Checkout.Session
    try {
      session = await createSession(true)
    } catch (err: any) {
      if (err?.type !== 'StripeInvalidRequestError') throw err
      console.warn('Bank setup: ownership data unavailable, linking without it:', err.message)
      session = await createSession(false)
    }

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Bank setup error:', error.message)
    return NextResponse.json({ error: 'Could not start bank linking. Please try again.' }, { status: 500 })
  }
}

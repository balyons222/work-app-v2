import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { ownerMatchesCompany, type AchBankStatus } from '@/src/config/ach'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

// Owner names come from the bank through Financial Connections. They may still be loading right
// after linking; in that case we save without them and the account goes to manual review.
async function fetchOwnerNames(fcAccountId: string | null | undefined): Promise<string[] | null> {
  if (!fcAccountId) return null
  try {
    const account = await stripe.financialConnections.accounts.retrieve(fcAccountId)
    const ownership = account.ownership
    const ownershipId = typeof ownership === 'string' ? ownership : ownership?.id
    if (!ownershipId || account.ownership_refresh?.status !== 'succeeded') return null
    const owners = await stripe.financialConnections.accounts.listOwners(fcAccountId, { ownership: ownershipId, limit: 10 })
    return owners.data.map(o => o.name).filter(Boolean)
  } catch (err: any) {
    console.error('Owner lookup failed:', err.message)
    return null
  }
}

// Called when the organizer returns from linking. Accepts BUSINESS accounts only:
//   holder type 'company' + an owner name matching the company name -> verified (usable now)
//   holder type 'company' but owners missing/mismatched, or holder type unknown -> needs admin review
//   holder type 'individual' -> rejected and removed from Stripe
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId } = await req.json().catch(() => ({}))
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing session.' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent', 'setup_intent.payment_method'],
    })
    if (session.metadata?.type !== 'org_bank_setup' || session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'This bank link doesn’t belong to your account.' }, { status: 403 })
    }
    const setupIntent = session.setup_intent as Stripe.SetupIntent | null
    const pm = setupIntent?.payment_method as Stripe.PaymentMethod | null
    if (session.status !== 'complete' || setupIntent?.status !== 'succeeded' || !pm?.us_bank_account) {
      return NextResponse.json({ error: 'Bank linking wasn’t completed. Please try again.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('company_name, full_name, ach_bank_payment_method_id')
      .eq('id', user.id)
      .single()

    const bank = pm.us_bank_account
    const holderType = bank.account_holder_type ?? null

    if (holderType === 'individual') {
      await stripe.paymentMethods.detach(pm.id).catch(() => {})
      return NextResponse.json({
        error: 'That’s a personal bank account. Bank payments need a business account in your company’s name. You can still pay by card.',
      }, { status: 400 })
    }

    const ownerNames = await fetchOwnerNames(bank.financial_connections_account)
    const status: AchBankStatus =
      holderType === 'company' && ownerNames && ownerMatchesCompany(ownerNames, profile?.company_name)
        ? 'verified'
        : 'needs_review'

    // Replacing a previously linked account: remove the old one from Stripe
    if (profile?.ach_bank_payment_method_id && profile.ach_bank_payment_method_id !== pm.id) {
      await stripe.paymentMethods.detach(profile.ach_bank_payment_method_id).catch(() => {})
    }

    const { error } = await admin.from('profiles').update({
      ach_bank_status: status,
      ach_bank_payment_method_id: pm.id,
      ach_bank_mandate_id: typeof setupIntent.mandate === 'string' ? setupIntent.mandate : setupIntent.mandate?.id ?? null,
      ach_bank_name: bank.bank_name ?? null,
      ach_bank_last4: bank.last4 ?? null,
      ach_bank_holder_type: holderType,
      ach_bank_owner_names: ownerNames ? ownerNames.join('; ') : null,
      ach_bank_linked_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (error) throw new Error(error.message)

    return NextResponse.json({
      status,
      message: status === 'verified'
        ? 'Business bank account linked. You can now pay for hires by bank.'
        : 'Bank account linked. We’re confirming it’s a business account in your company’s name, usually within 1 business day.',
    })
  } catch (error: any) {
    console.error('Bank confirm error:', error.message)
    return NextResponse.json({ error: 'Could not confirm the bank account. Please try again.' }, { status: 500 })
  }
}

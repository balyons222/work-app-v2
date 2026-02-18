import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/src/utils/supabase/server'; // Use server client for safety

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // Use latest API version
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get the profile to check if they already have a Stripe Account ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email, full_name')
      .eq('id', user.id)
      .single();

    let accountId = profile?.stripe_account_id;

    // 2. If NO account exists, create one in Stripe
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express', // 'express' is best for gig platforms (they get a simple dashboard)
        country: 'US',
        email: profile?.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Default for contractors
        individual: {
            email: profile?.email,
            first_name: profile?.full_name?.split(' ')[0],
            last_name: profile?.full_name?.split(' ').slice(1).join(' '),
        }
      });

      accountId = account.id;

      // Save the new Stripe ID to your database immediately
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
    }

    // 3. Create the "Account Link" (The URL they visit to onboard)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?refresh=true`, // If they get stuck, go here
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?success=true`,   // If they finish, go here
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (err: any) {
    console.error('Stripe Connect Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

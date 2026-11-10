import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, // Use your current API version
});

// 2. Initialize Supabase Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`[Stripe API] Starting onboarding for User: ${userId}`);

    // 3. Get the user's profile to see if they already have a Stripe ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found in database');
    }

    let stripeAccountId = profile.stripe_account_id;

    // 4. Validate or create the account
if (stripeAccountId) {
  try {
    // Ping Stripe to ensure the account still exists
    await stripe.accounts.retrieve(stripeAccountId);
  } catch (err: any) {
    if (err.code === 'resource_missing' || err.code === 'account_invalid') {
      console.log('[Stripe API] Ghost account detected. Resetting...');
      stripeAccountId = null; // Force the creation of a new one below
    } else {
      throw err; // It's a real error, throw it
    }
  }
}

if (!stripeAccountId) {
  console.log('[Stripe API] Creating new Stripe Express account...');
  const account = await stripe.accounts.create({
    type: 'express',
    email: profile.email || undefined,
  });
  
  stripeAccountId = account.id;

  // Save this new valid Stripe ID to Supabase
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_account_id: stripeAccountId })
    .eq('id', userId);
}

    // 5. Generate the magic Stripe Onboarding Link
// This dynamically gets localhost locally, and fxdevents.com in production
const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com';

console.log(`[Stripe API] Generating link. Return URL: ${origin}/dashboard`);

const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId,
  refresh_url: `${origin}/dashboard`,
  return_url: `${origin}/dashboard?success=true`,
  type: 'account_onboarding',
});
    // 6. Send the link back to the frontend so it can redirect the user
    return NextResponse.json({ url: accountLink.url });

  } catch (err: any) {
    console.error('[Stripe API] Server Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
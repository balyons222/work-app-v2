import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/src/utils/supabase/admin'
import { createClient as createServerClient } from '@/src/utils/supabase/server';

// 1. Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// 2. Initialize Supabase Admin
const supabaseAdmin = createAdminClient();

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const userId = user.id;

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
        await stripe.accounts.retrieve(stripeAccountId);
      } catch (err: any) {
        if (err.code === 'resource_missing' || err.code === 'account_invalid') {
          console.log('[Stripe API] Ghost account detected. Resetting...');
          stripeAccountId = null; 
        } else {
          throw err; 
        }
      }
    }

    if (!stripeAccountId) {
      console.log('[Stripe API] Creating new Stripe Express account...');
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: profile.email || undefined,
        // FIX: Explicitly request transfers and inject metadata for webhook safety
        capabilities: { transfers: { requested: true } },
        metadata: { supabase_user_id: userId },
      });
      
      stripeAccountId = account.id;

      // FIX: Strictly catch database update failures so we don't strand the user
      const { error: saveError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', userId);
        
      if (saveError) {
        throw new Error(`Failed to save Stripe account: ${saveError.message}`);
      }
    }

    // 5. Generate the magic Stripe Onboarding Link
    let rawOrigin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com';

    if (rawOrigin.includes('localhost')) {
      rawOrigin = 'https://fxdevents.com';
    }

    const safeOrigin = rawOrigin.startsWith('http://') 
      ? rawOrigin.replace('http://', 'https://') 
      : rawOrigin;

    console.log(`[Stripe API] Generating link. Return URL: ${safeOrigin}/dashboard`);

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${safeOrigin}/dashboard`,
      return_url: `${safeOrigin}/dashboard?success=true`,
      type: 'account_onboarding',
    });
    
    // 6. Send the link back to the frontend
    return NextResponse.json({ url: accountLink.url });

  } catch (err: any) {
    console.error('[Stripe API] Server Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
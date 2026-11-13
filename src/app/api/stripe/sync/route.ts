import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/src/utils/supabase/admin'
import { createClient as createServerClient } from '@/src/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabaseAdmin = createAdminClient();

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get the Stripe Account ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account found' }, { status: 404 });
    }

    // 2. Fetch live status from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // 3. Update Supabase immediately
    await supabaseAdmin
      .from('profiles')
      .update({ payouts_enabled: account.payouts_enabled })
      .eq('id', user.id);

    return NextResponse.json({ 
      success: true, 
      payouts_enabled: account.payouts_enabled 
    });

  } catch (err: any) {
    console.error('[Stripe Sync API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/src/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Verify the caller is securely logged in
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = ['brian@fxdevents.com', 'brian@l27consulting.com'];
    if (!user.email || !adminEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } // <--- THIS WAS MISSING!

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing target user ID' }, { status: 400 });
    }

    // 2. Initialize the Supabase Admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Delete their public profile data first (prevents ghost profiles)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetUserId);

    // 4. Delete their secure Auth account
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUserId
    );

    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Admin API] Delete User Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
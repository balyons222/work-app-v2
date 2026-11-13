import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/utils/supabase/admin'
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
    const supabaseAdmin = createAdminClient();

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
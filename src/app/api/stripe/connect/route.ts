import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// 2. Initialize Supabase Admin (MUST use SERVICE_ROLE_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, message, link } = body;

    console.log(`[Notify API] Attempting to notify User ID: ${userId}`);

    // 3. Get the recipient's email securely
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      console.error('[Notify API] User Lookup Error:', userError);
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    console.log(`[Notify API] Found email: ${user.email}. Sending via Resend...`);

    // 4. Send the Email via Resend
    const { data, error } = await resend.emails.send({
      from: 'FxD Staffing <hello@fxdevents.com>', // ✅ UPDATED HERE
      to: [user.email], 
      subject: `🔔 ${title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h1 style="color: #333;">${title}</h1>
          <p style="font-size: 16px; color: #555;">${message}</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com'}${link}" 
             style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
             View Dashboard
          </a>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">
            You received this notification from FxD Event Staffing.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Notify API] Resend Error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log('[Notify API] Success:', data);
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('[Notify API] Server Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
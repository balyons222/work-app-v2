import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase Admin to fetch user emails securely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, title, message, link, type } = await request.json();

    // 1. Get the recipient's email securely
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // 2. Send the Email via Resend
    const { data, error } = await resend.emails.send({
      from: 'FxD Staffing <onboarding@resend.dev>', // Use your verified domain later
      to: [user.email], 
      subject: `🔔 ${title}`, // E.g. "🔔 You're Hired!"
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h1 style="color: #333;">${title}</h1>
          <p style="font-size: 16px; color: #555;">${message}</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${link}" 
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
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

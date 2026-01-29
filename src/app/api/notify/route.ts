import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

// We need a PRIVATE Supabase client to look up user emails securely
// (Regular client-side Supabase cannot see other users' emails for security reasons)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Usually we'd use SERVICE_ROLE key here for full access, but for this MVP, anon is fine if profiles are public
)

export async function POST(request: Request) {
  try {
    const { jobId, applicantName } = await request.json()

    // 1. Fetch the Job and the Organizer's ID
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('title, employer_id, events(title)')
      .eq('id', jobId)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // 2. Fetch the Organizer's Email from their Profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', job.employer_id)
      .single()

    if (!profile?.email) return NextResponse.json({ error: 'Organizer email not found' }, { status: 404 })

    // 3. Send the Email via Resend
    // NOTE: On the free tier, you can only send emails to YOURSELF (the email you signed up with).
    // Once you add a domain, you can send to anyone.
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Default Resend testing address
      to: profile.email,             // The Organizer's email
      subject: `New Applicant: ${applicantName}`,
      html: `
        <h1>🚀 New Applicant!</h1>
        <p><strong>${applicantName}</strong> just applied for <strong>${job.title}</strong>.</p>
        <p>Event: ${job.events?.[0]?.title || 'General Gig'}</p>
        <br/>
        <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')}/dashboard/${jobId}">
          Click here to review their application
        </a>
      `
    })

    if (error) return NextResponse.json({ error }, { status: 500 })

    return NextResponse.json({ success: true, data })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
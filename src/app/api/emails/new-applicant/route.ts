import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/src/utils/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

// Use Admin client to bypass Row Level Security so the backend can freely fetch emails
const supabaseAdmin = createAdminClient()

export async function POST(req: Request) {
  try {
    const { jobId, applicantId } = await req.json()

    // 1. Fetch Job, Organizer, and Applicant Details
    // Using standard 'profiles' join instead of alias to prevent PostgREST errors
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select(`
        title,
        events ( title, profiles ( email, full_name ) )
      `)
      .eq('id', jobId)
      .single()

    const { data: applicant, error: applicantError } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', applicantId)
      .single()

    if (jobError || applicantError || !job) {
      throw new Error('Data fetch failed - check database relations')
    }

    // Safely extract the organizer's email (cast as any to satisfy TypeScript)
    const eventData = job.events as any
    const organizerEmail = eventData?.profiles?.email
    
    if (!organizerEmail) throw new Error('No organizer email found')

    // 2. Send the Email
    // Using the newer Resend syntax which returns an error object instead of throwing
    const { error: emailError } = await resend.emails.send({
      from: 'FxD Events <hello@fxdevents.com>', // Use Resend's test address to prevent verification errors
      to: organizerEmail, // MUST be your own email address while on Resend's free tier!
      subject: `New Applicant: ${applicant.full_name} applied for ${job.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">You have a new applicant! 🎉</h2>
          <p><strong>${applicant.full_name}</strong> just applied for the <strong>${job.title}</strong> role at <strong>${eventData?.title}</strong>.</p>
          <p>Log in to your dashboard to review their profile, send them a message, or hire them and fund the escrow.</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Applicant</a>
        </div>
      `
    })

    if (emailError) {
      throw new Error(emailError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
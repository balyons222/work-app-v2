import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServerClient } from '@/src/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    
    // 1. Authenticate the caller
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { applicationId } = await req.json()
    if (!applicationId) return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })

    // 2. Fetch application and job data (User Context)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id, funding_status, status, applicant_id,
        jobs!inner ( id, rate, rate_type, estimated_hours, organizer_id, title, event_id )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // 3. Strict Status & Ownership Checks
    if (application.jobs.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this job.' }, { status: 403 })
    }
    if (application.funding_status === 'funded') {
      return NextResponse.json({ error: 'This application has already been funded.' }, { status: 400 })
    }
    if (application.status !== 'pending' && application.status !== 'approved') {
      return NextResponse.json({ error: 'Application must be pending or approved to fund.' }, { status: 400 })
    }

    // 4. Service-Role Fetch for Contractor Profile (Bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: contractor } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id, full_name')
      .eq('id', application.applicant_id)
      .single()

    if (!contractor?.stripe_account_id) {
      return NextResponse.json({ error: 'Contractor has not connected a Stripe account.' }, { status: 400 })
    }

    // 5. Live Stripe Account Verification (Updated to include transfers capability)
    const stripeAccount = await stripe.accounts.retrieve(contractor.stripe_account_id)
    const canReceive = stripeAccount.capabilities?.transfers === 'active' && stripeAccount.payouts_enabled
    
    if (!canReceive) {
      return NextResponse.json({ 
        error: 'Cannot fund escrow: This contractor’s Stripe account cannot currently receive transfers and payouts.' 
      }, { status: 400 })
    }

    // 6. Safe Integer Math (Cents)
    const laborCost = application.jobs.rate_type === 'hourly' 
      ? (application.jobs.rate * (application.jobs.estimated_hours || 0)) 
      : application.jobs.rate

    const laborCents = Math.round(laborCost * 100)
    const feeCents = Math.round(laborCents * 0.10)
    const amountInCents = laborCents + feeCents

    if (amountInCents < 50) {
      return NextResponse.json({ error: 'Total escrow amount must be at least $0.50' }, { status: 400 })
    }

    // 7. Environment & Unified URL Configuration (Trailing slash fixed)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl && process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_SITE_URL environment variable is missing in production.')
    }
    const baseUrl = siteUrl?.replace(/\/$/, '') || 'http://localhost:3000'
    
    const successUrl = `${baseUrl}/dashboard/event/${application.jobs.event_id}?funded=true`
    const cancelUrl = `${baseUrl}/dashboard/event/${application.jobs.event_id}?funded=cancelled`

    // 8. Create the Stripe Checkout Session (Expires in 30 mins, idempotency key removed)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Escrow Funding: ${application.jobs.title}`,
              description: `Labor: $${(laborCents / 100).toFixed(2)} + Platform Fee: $${(feeCents / 100).toFixed(2)}\nContractor: ${contractor.full_name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: application.id,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expires in 30 minutes
      metadata: {
        application_id: application.id,
        job_id: application.jobs.id,
        organizer_id: user.id,
        contractor_id: contractor.id,
        type: 'job_escrow_funding'
        labor_cents: String(laborCents)
      }
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Funding Error:', error.message)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
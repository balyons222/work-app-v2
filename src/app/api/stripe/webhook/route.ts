import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { tierForPrice } from '@/src/config/stripePrices'

// 1. Initialize Stripe (Aligned API Version)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, 
})

// 2. Initialize Supabase Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string 
)

// Escape user-controlled values (names, job/event titles) before putting them in email HTML
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new NextResponse('Missing stripe-signature header', { status: 400 })

  // ========================================================
  // 3. FIX: MULTI-SECRET VERIFICATION LOOP
  // ========================================================
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter(Boolean) as string[]

  if (secrets.length === 0) {
    console.error('❌ Webhook Error: no webhook secrets configured')
    return new NextResponse('Webhook not configured', { status: 500 })
  }

  let event: Stripe.Event | null = null
  let lastError = ''

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret)
      break // Stop if verification succeeds
    } catch (err: any) {
      lastError = err.message
    }
  }

  if (!event) {
    console.error(`❌ Webhook Error: ${lastError}`)
    return new NextResponse(`Webhook Error: ${lastError}`, { status: 400 })
  }

  // ========================================================
  // EVENT: CHECKOUT COMPLETED (Escrow OR Subscription)
  // ========================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // SCENARIO A: ESCROW FUNDING
    if (session.metadata?.type === 'job_escrow_funding') {
      if (session.payment_status !== 'paid') {
        return new NextResponse('Not paid yet', { status: 200 })
      }

      const applicationId = session.metadata.application_id
      const paymentIntentId = session.payment_intent as string
      if (!applicationId || !paymentIntentId) {
        console.error('Escrow session missing application_id or payment_intent:', session.id)
        return new NextResponse('Malformed escrow session', { status: 200 }) // Retrying won't help
      }

      let chargeId = ''
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        chargeId = paymentIntent.latest_charge as string
      } catch (err: any) {
        console.error('Failed to retrieve payment intent:', err.message)
        return new NextResponse('Stripe API error', { status: 500 }) // Retries
      }

      // FIX: Null-safe idempotent update
      const { data: updated, error } = await supabaseAdmin
        .from('applications')
        .update({
          status: 'approved',
          funding_status: 'funded',
          stripe_payment_intent_id: paymentIntentId,
          stripe_charge_id: chargeId,
          funded_amount_cents: session.amount_total,
          funded_labor_cents: parseInt(session.metadata.labor_cents || '0', 10),
        })
        .eq('id', applicationId)
        // Only transition from an unfunded state. The old `neq.funded` filter also matched 'released',
        // so a replayed/duplicate checkout could flip a PAID application back to 'funded' and enable a second payout.
        .or('funding_status.is.null,funding_status.not.in.(funded,released,refunded)')
        .select('id, applicant_id, jobs(id, title, organizer_id, events(title))')

      if (error) {
        console.error('Database update error:', error.message)
        return new NextResponse('Database error', { status: 500 })
      }

      if (!updated || updated.length === 0) {
        // Either a Stripe retry of this same session (safe to ignore), or a SECOND checkout session
        // was paid for an application that's already funded (two tabs / double click). In the latter
        // case the organizer was charged twice, so refund the duplicate.
        const { data: existing } = await supabaseAdmin
          .from('applications')
          .select('stripe_payment_intent_id')
          .eq('id', applicationId)
          .maybeSingle()

        if (existing && existing.stripe_payment_intent_id && existing.stripe_payment_intent_id !== paymentIntentId) {
          try {
            await stripe.refunds.create(
              { payment_intent: paymentIntentId, reason: 'duplicate' },
              { idempotencyKey: `dup-escrow-refund-${paymentIntentId}` }
            )
            console.warn(`Refunded duplicate escrow payment ${paymentIntentId} for app ${applicationId}`)
          } catch (refundErr: any) {
            console.error('Duplicate escrow refund failed:', refundErr.message)
            return new NextResponse('Refund error', { status: 500 }) // Retry
          }
          return new NextResponse('Duplicate payment refunded', { status: 200 })
        }

        console.log('Webhook event already processed for app:', applicationId)
        return new NextResponse('Already processed', { status: 200 })
      }

 // 5. Send Notifications ONLY on the first successful pass
          try {
            // Lazy load Resend here so it only spins up if we actually need it
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)
            
            const appData = updated[0] as any
            const job = Array.isArray(appData.jobs) ? appData.jobs[0] : appData.jobs
            const evt = Array.isArray(job?.events) ? job.events[0] : job?.events
            const applicantId = appData.applicant_id
            const organizerId = job?.organizer_id
            const jobId = job?.id
            const jobTitle = job?.title || 'a new role'
            const eventTitle = evt?.title || 'an upcoming event'

            // Fetch the contractor's profile for the email
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('email, full_name')
              .eq('id', applicantId)
              .single()

            // A. Send the "You're Hired" Email
            if (profile?.email) {
              await resend.emails.send({
                // Ensure this exact domain is verified in your Resend dashboard
                from: 'FxD Events <notifications@fxdevents.com>', 
                to: profile.email,
                subject: `You're Hired! ${jobTitle} for ${eventTitle}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
                    <h2>Great news, ${escapeHtml(profile.full_name || 'there')}!</h2>
                    <p>You have been officially hired for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(eventTitle)}</strong>.</p>
                    <p>The organizer has successfully funded the escrow for this shift, and the money is securely locked in.</p>
                    <p style="margin-top: 32px;">
                      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View Details & Chat
                      </a>
                    </p>
                  </div>
                `
              })
            }

            // B. Setup the Automated Chat Message
            if (organizerId && jobId) {
              // 1. Check if a conversation already exists for this application
              const { data: existingChat } = await supabaseAdmin
                .from('conversations')
                .select('id')
                .eq('application_id', applicationId)
                .maybeSingle()

              let chatId = existingChat?.id

              // 2. If no conversation exists, create one
              if (!chatId) {
                const { data: newChat, error: chatError } = await supabaseAdmin
                  .from('conversations')
                  .insert({
                    job_id: jobId,
                    application_id: applicationId,
                    organizer_id: organizerId,
                    worker_id: applicantId
                  })
                  .select('id')
                  .single()
                
                if (chatError) throw new Error(`Chat creation failed: ${chatError.message}`)
                chatId = newChat?.id
              }

              // 3. Insert the automated welcome message on behalf of the organizer
              if (chatId) {
                await supabaseAdmin
                  .from('messages')
                  .insert({
                    conversation_id: chatId,
                    sender_id: organizerId, 
                    content: `Hi! You are officially hired and the escrow has been funded for this shift. Let me know if you have any questions before the event! 🚀`
                  })
              }
            }

          } catch (notifErr: any) {
            // We log this but DO NOT return a 500. The money moved and the DB updated.
            // If we return 500, Stripe will retry the webhook and duplicate the DB operations.
            console.error('Notification error:', notifErr.message)
          }
    }

    // SCENARIO B: USER BUYING PRO SUBSCRIPTION
    else if (session.mode === 'subscription' && session.client_reference_id) {
      const userId = session.client_reference_id
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      // Derive the tier from the price actually paid, never from metadata (which a caller could influence)
      let tier: string | null = null
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 })
        for (const item of lineItems.data) {
          tier = tierForPrice(item.price?.id)
          if (tier) break
        }
      } catch (err: any) {
        console.error('Failed to read subscription line items:', err.message)
        return new NextResponse('Stripe API error', { status: 500 }) // Retry
      }

      if (!tier) {
        // Paid for a price we don't recognize: don't grant anything, flag for manual review
        console.error('❌ Subscription for unknown price — no tier granted', { sessionId: session.id, userId })
        return new NextResponse('Unknown price', { status: 200 }) // Retrying won't help
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ plan_tier: tier, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId })
        .eq('id', userId)
        
      if (error) {
        console.error('❌ Subscription DB Update Error:', error.message)
        return new NextResponse('Database Error', { status: 500 }) // Forces Stripe retry
      }
      return new NextResponse('Subscription activated successfully', { status: 200 })
    }
  }

  // ========================================================
  // EVENT: SUBSCRIPTION CANCELED
  // ========================================================
  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ plan_tier: 'basic', stripe_subscription_id: null })
      .eq('stripe_customer_id', subscription.customer as string)

    if (error) {
      console.error('❌ Sub delete error:', error.message)
      return new NextResponse('Database Error', { status: 500 }) // Forces Stripe retry
    }
  }

  // ========================================================
  // EVENT: CONNECT ACCOUNT ONBOARDED
  // ========================================================
  else if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    
    if (account.id) {
      try {
        const freshAccount = await stripe.accounts.retrieve(account.id)
        
        // FIX: Combine payouts check with transfer capability
        const eligible = !!freshAccount.payouts_enabled && freshAccount.capabilities?.transfers === 'active'

        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({ payouts_enabled: eligible })
          .eq('stripe_account_id', freshAccount.id)
          .select('id')

        if (error) {
          console.error('Account update DB error:', error.message)
          return new NextResponse('Database error', { status: 500 })
        }
        
        if (!data || data.length === 0) {
          console.log(`No matching profile for Stripe account ${freshAccount.id}`)
        }
      } catch (err: any) {
        console.error('Failed to retrieve fresh connect account:', err.message)
        return new NextResponse('Stripe Error', { status: 500 })
      }
    }
  }

  return new NextResponse('Webhook processed successfully', { status: 200 })
}
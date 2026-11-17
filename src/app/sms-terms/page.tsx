import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SMS Terms & Conditions | FxD Events',
}

// SMS program terms for carrier / Twilio messaging registration.
// PROGRAM_NAME must match the brand name registered with Twilio exactly.
const PROGRAM_NAME = 'FxD Event Staffing'
const CONTACT_EMAIL = 'hello@fxdevents.com'

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="font-bold text-slate-800 text-lg mt-8 mb-2">{children}</h2>
)

export default function SmsTermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h1 className="text-3xl font-black text-primary mb-8">SMS Terms &amp; Conditions</h1>

        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Last Updated: November 17, 2026</p>

          <H>1. Program Description</H>
          <p>
            {PROGRAM_NAME} (&quot;FxD Events&quot;) sends one-time verification codes by text message to people who
            choose to sign in to fxdevents.com with their mobile phone number. These messages are used only to verify
            your identity and sign you in. We do not send marketing or promotional text messages.
          </p>

          <H>2. How You Opt In</H>
          <p>
            You opt in by entering your mobile number on our{' '}
            <Link href="/login" className="text-secondary font-bold hover:underline">sign-in page</Link>, checking the box
            to agree to receive SMS verification codes, and selecting &quot;Send Login Code.&quot; Agreeing to receive
            text messages is not a condition of any purchase. You can sign in with Google instead.
          </p>

          <H>3. Message Frequency</H>
          <p>You receive one message each time you request a sign-in code. Message frequency varies with how often you sign in.</p>

          <H>4. Cost</H>
          <p><strong>Message and data rates may apply.</strong> Check with your mobile carrier for details about your plan.</p>

          <H>5. How to Opt Out</H>
          <p>
            Reply <strong>STOP</strong> to any message to stop receiving texts from us. You will receive one final
            message confirming you have been unsubscribed. After opting out, you won&apos;t receive sign-in codes; you can
            still sign in with Google, or reply <strong>START</strong> to receive codes again.
          </p>

          <H>6. Help</H>
          <p>
            Reply <strong>HELP</strong> to any message for help, or email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary font-bold hover:underline">{CONTACT_EMAIL}</a>.
          </p>

          <H>7. Carriers</H>
          <p>
            Messages are supported by major U.S. carriers. Carriers are not liable for delayed or undelivered messages.
          </p>

          <H>8. Privacy</H>
          <p>
            No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.
            Text messaging opt-in data and consent will not be shared with any third parties. See our{' '}
            <Link href="/privacy" className="text-secondary font-bold hover:underline">Privacy Policy</Link> for how we
            handle your information.
          </p>

          <H>9. Changes</H>
          <p>We may update these SMS Terms. We will post changes on this page and update the date above.</p>

          <H>10. Contact</H>
          <p>
            Questions about our text messages:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary font-bold hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

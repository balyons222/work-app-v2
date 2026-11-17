import type { ReactNode } from 'react'

// DRAFT for legal review. Replace the business name below with the registered legal entity name.
const LEGAL_NAME = 'FxD Events'
const CONTACT_EMAIL = 'hello@fxdevents.com'

const H = ({ children }: { children: ReactNode }) => (
  <h2 className="font-bold text-slate-800 text-lg mt-8 mb-2">{children}</h2>
)
const Sub = ({ children }: { children: ReactNode }) => (
  <h3 className="font-bold text-slate-700 mt-4">{children}</h3>
)
const List = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-6 space-y-1">{children}</ul>
)

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h1 className="text-3xl font-black text-primary mb-8">Privacy Policy</h1>

        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>Last Updated: November 17, 2026</p>

          <p>
            {LEGAL_NAME} (&quot;FxD Events,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) runs fxdevents.com, a marketplace
            that connects event organizers with independent event professionals. This policy explains what
            information we collect, how we use and share it, and the choices you have. You must be 18 or older to
            use FxD Events.
          </p>

          <H>1. Information We Collect</H>

          <Sub>Information you give us</Sub>
          <List>
            <li><strong>Account:</strong> your name, email address, and mobile phone number. You can sign in with Google or with a one-time code sent to your phone.</li>
            <li><strong>Profile:</strong> photo, city and state, bio, account type (contractor or organizer), and, for organizers, your company name and website.</li>
            <li><strong>Contractor details:</strong> skills, certifications, years of experience, hourly rate, availability, willingness to travel, and portfolio images.</li>
            <li><strong>Confirmations:</strong> when you confirm you are 18 or older and when you accept our Terms.</li>
            <li><strong>Messages and reviews:</strong> messages you send other users, and ratings and reviews you write.</li>
          </List>

          <Sub>Payment and tax information</Sub>
          <p>
            Payments run through <strong>Stripe</strong>. Sensitive financial details are entered on Stripe&apos;s pages and
            stored by Stripe, not by us.
          </p>
          <List>
            <li><strong>Contractors:</strong> Stripe collects your legal name, date of birth, address, Social Security or Employer Identification Number, and bank account to verify your identity and pay you. We receive your Stripe account ID and whether payouts are enabled.</li>
            <li><strong>Organizers paying by card:</strong> Stripe collects your card details. We never see your full card number.</li>
            <li><strong>Organizers paying by bank:</strong> if you link a bank account, you sign in to your bank through Stripe Financial Connections. We receive the bank name, the last 4 digits of the account, whether it is a business or personal account, and the account owner names on file with the bank. We use these only to confirm it is a business account in your company&apos;s name. We never receive your bank login or full account number.</li>
            <li><strong>Subscriptions:</strong> your plan, and the Stripe customer and subscription IDs that link your account to it.</li>
          </List>

          <Sub>Information created when you use the platform</Sub>
          <p>
            Events, roles, invitations, applications, hires, hours worked, payment and payout records, notifications,
            and support requests.
          </p>

          <Sub>Technical information</Sub>
          <p>
            We use cookies only to keep you signed in. Our hosting and database providers keep standard logs, such as IP
            address, browser type, and the time of a request, for security and troubleshooting. We do not use
            advertising cookies or third-party tracking for ads.
          </p>

          <H>2. How We Use Your Information</H>
          <List>
            <li>To run the marketplace: show profiles, match organizers with contractors, and manage events, hires, and messages.</li>
            <li>To process payments, payouts, and refunds, and to support tax reporting (Stripe issues 1099 forms where required).</li>
            <li>To verify accounts, confirm bank accounts are business accounts, and prevent fraud, chargebacks, and misuse.</li>
            <li>To send sign-in codes, job and payment notifications, and service emails.</li>
            <li>To provide support, enforce our Terms, and keep the platform safe.</li>
            <li>To comply with legal obligations.</li>
          </List>

          <H>3. What Other Users Can See</H>
          <List>
            <li><strong>Profiles:</strong> your name, photo, city and state, bio, skills, experience, portfolio, rating, and reviews are visible to other users. Contractors can hide themselves from the Find Talent search in Preferences.</li>
            <li><strong>Contact details:</strong> your email address and phone number are shared only with an organizer who has hired you, so you can coordinate the job.</li>
            <li><strong>Messages:</strong> only the people in a conversation can read it.</li>
            <li><strong>Reviews:</strong> reviews you write appear on the reviewed person&apos;s profile with your name.</li>
          </List>

          <H>4. How We Share Information</H>
          <p>We do not sell your personal information or share it for targeted advertising. We share it only:</p>
          <List>
            <li><strong>With service providers</strong> who run parts of the platform for us: Stripe (payments, payouts, identity and bank verification), Supabase (hosting, database, and sign-in), Resend (email), our SMS provider (sign-in codes and texts), and Google (if you choose Google sign-in). They may use your information only to provide their service.</li>
            <li><strong>With other users</strong> as described in Section 3.</li>
            <li><strong>For legal reasons:</strong> to comply with law or legal process, to protect the rights, safety, or property of our users or FxD Events, or to investigate fraud or payment disputes.</li>
            <li><strong>In a business transfer:</strong> if FxD Events is merged, acquired, or sells its assets, your information may transfer as part of that transaction under this policy.</li>
          </List>

          <H>5. SMS &amp; Mobile Data Policy</H>
          <p className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-medium text-slate-700">
            No mobile information will be shared with third parties or affiliates for marketing
            or promotional purposes. All other categories exclude text messaging originator
            opt-in data and consent; this information will not be shared with any third parties.
          </p>

          <H>6. Opting Out of Communications</H>
          <p>
            You may opt out of receiving SMS messages from us at any time by replying <strong>STOP</strong> to
            any message. Standard message and data rates may apply. For assistance, you can
            reply <strong>HELP</strong> or contact our support team. Some messages, such as sign-in codes and
            notices about payments for your jobs, are part of the service and can&apos;t be turned off while your account is active.
          </p>

          <H>7. How Long We Keep Information</H>
          <p>
            We keep your information while your account is open. When you delete your account, we delete your profile
            and account information. We keep records we are required to keep, such as payment, payout, and tax records
            and records needed for disputes or fraud prevention, for as long as the law requires (generally up to 7
            years). Stripe keeps the financial information it collects under its own privacy policy.
          </p>

          <H>8. Your Choices and Rights</H>
          <List>
            <li><strong>Access and correct:</strong> you can view and edit most of your information on your profile at any time.</li>
            <li><strong>Delete:</strong> email {CONTACT_EMAIL} to delete your account. We will confirm it is you before deleting anything.</li>
            <li><strong>Copy of your data:</strong> email us to request a copy of the personal information we hold about you.</li>
            <li><strong>Visibility:</strong> contractors can hide their profile from Find Talent. Organizers can remove a linked bank account by contacting us.</li>
          </List>
          <p>
            Depending on where you live, you may have additional rights under state privacy laws. Email us to make a
            request; we will respond within the time the law requires, and we will not treat you differently for making one.
          </p>

          <H>9. Data Security</H>
          <p>
            Data is encrypted in transit, access to personal information is limited by account and role, and
            sensitive financial details (card numbers, bank logins, full account numbers, and tax ID numbers) are
            held by Stripe rather than on our servers. No system is perfectly secure, so please use a strong password
            and keep your sign-in methods private.
          </p>

          <H>10. Children</H>
          <p>
            FxD Events is only for people 18 and older. We do not knowingly collect information from anyone under 18.
            If you believe a minor has created an account, contact us and we will delete it.
          </p>

          <H>11. Changes to This Policy</H>
          <p>
            We will update the date at the top when this policy changes. If a change is significant, we will notify
            you by email or in the app before it takes effect.
          </p>

          <H>12. Contact Us</H>
          <p>
            Questions or requests about your privacy: <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary font-bold hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { HelpShell, Section, Table, Faq, UI, NextLink } from '@/src/components/help/HelpUI'
import { BASIC_FEE_RATE, PRO_HUB_FEE_RATE } from '@/src/config/platformFees'
import {
  BASIC_MONTHLY_APPLICATIONS,
  CONTRACTOR_PRO_MONTHLY_USD,
  ORGANIZER_HUB_MONTHLY_USD,
} from '@/src/config/subscriptions'

export const metadata: Metadata = {
  title: 'Help Center | FxD Events',
  description: 'How FxD Events works for event contractors and organizers: profiles, Stripe setup, applying, hiring and payments.',
}

const pct = (r: number) => `${Math.round(r * 100)}%`

export default function HelpPage() {
  return (
    <HelpShell
      active="/help"
      title="How FxD Events works"
      intro={
        <p>
          Organizers post roles for their events, contractors apply, and payment for each hire is held by Stripe until
          the work is done. Start by choosing the account type that fits you.
        </p>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/help/contractors"
          className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-secondary hover:shadow-md transition-all"
        >
          <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">I want to work events</p>
          <h2 className="text-xl font-black text-slate-900 mb-2">Contractor guide</h2>
          <p className="text-slate-600 text-sm">Build your profile, set up payouts, apply for roles and get paid.</p>
          <p className="mt-4 text-sm font-bold text-primary group-hover:text-secondary">Read the guide →</p>
        </Link>
        <Link
          href="/help/organizers"
          className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-secondary hover:shadow-md transition-all"
        >
          <p className="text-xs font-black uppercase tracking-widest text-secondary mb-2">I run events</p>
          <h2 className="text-xl font-black text-slate-900 mb-2">Organizer guide</h2>
          <p className="text-slate-600 text-sm">Create events and roles, invite talent, hire, and release payment.</p>
          <p className="mt-4 text-sm font-bold text-primary group-hover:text-secondary">Read the guide →</p>
        </Link>
      </div>

      <Section id="account-types" title="Which account type should I choose?">
        <p>
          Choose <UI>Event Professional</UI> if you want to be hired and paid for work. Choose <UI>Event Organizer</UI> if
          you run events and hire staff. You pick one type during profile setup, and only support can change it later.
          Use a second email address if you need both.
        </p>
        <Table
          head={['', 'Event Professional (contractor)', 'Event Organizer']}
          rows={[
            ['Who it’s for', 'Timers, site leads, announcers, photographers, drivers, event support', 'Race directors, production companies, event managers'],
            ['What you do', 'Build a profile, apply for roles, accept invites, get paid', 'Create events, post roles, invite and hire talent, pay through Stripe'],
            ['Stripe setup', 'A Stripe payout account to receive pay', 'None. You pay at checkout when you hire'],
            ['Free plan', `Basic: $0, ${BASIC_MONTHLY_APPLICATIONS} applications a month (invites don’t count)`, `Basic: $0, ${pct(BASIC_FEE_RATE)} platform fee on labor`],
            ['Paid plan', `Contractor Pro: $${CONTRACTOR_PRO_MONTHLY_USD}/month. Unlimited applications, listed first in searches and applicant lists, Pro badge`, `Organizer Hub: $${ORGANIZER_HUB_MONTHLY_USD}/month. ${pct(PRO_HUB_FEE_RATE)} platform fee, advanced talent filters, bulk messaging`],
          ]}
        />
        <p className="text-sm">
          Everyone must confirm they are 18 or older during setup. See <NextLink href="/pricing">Pricing</NextLink> for
          plan details.
        </p>
      </Section>

      <Section id="faq" title="Frequently asked questions">
        <div>
          <Faq q="I picked the wrong account type.">
            Contact support at <a href="mailto:hello@fxdevents.com" className="text-secondary font-bold hover:underline">hello@fxdevents.com</a>.
            The account type can’t be changed from your profile.
          </Faq>
          <Faq q="Can I be both a contractor and an organizer?">
            Not on one login yet. Use a separate email address for each account.
          </Faq>
          <Faq q="Is FxD Events the employer?">
            No. FxD Events connects organizers with independent contractors. Contractors are responsible for their own
            taxes; Stripe sends 1099 forms where required.
          </Faq>
          <Faq q="Does FxD Events see my bank details or SSN?">
            No. Stripe collects and stores them. FxD Events only sees whether your payout setup is complete.
          </Faq>
          <Faq q="An organizer can’t hire me.">
            Your payout setup isn’t finished. Select <UI>Setup Payouts &amp; W-9</UI> on your dashboard and complete
            every Stripe step. <NextLink href="/help/contractors#stripe">How to set up payouts</NextLink>
          </Faq>
          <Faq q="I was paid but don’t see the money in my bank.">
            Check <UI>View Stripe Dashboard</UI>. Released pay shows as pending until the organizer’s payment settles
            (about 2 business days), then goes to your bank on Stripe’s payout schedule.
          </Faq>
          <Faq q="I estimated too many hours for a hire.">
            Log the actual hours before you release payment. The unused labor and its fee are refunded to your card.{' '}
            <NextLink href="/help/organizers#release">Logging hours and releasing payment</NextLink>
          </Faq>
          <Faq q="Where are the rules for payments and disputes?">
            In our <NextLink href="/privacy">Privacy Policy</NextLink> and the Terms of Service you accept before your
            first event or application.
          </Faq>
        </div>
        <p className="text-sm">
          Still stuck? Email <a href="mailto:hello@fxdevents.com" className="text-secondary font-bold hover:underline">hello@fxdevents.com</a>.
        </p>
      </Section>
    </HelpShell>
  )
}

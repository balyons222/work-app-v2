import type { Metadata } from 'next'
import { HelpShell, Section, Steps, Bullets, UI, Tip, Table, NextLink, type TocItem } from '@/src/components/help/HelpUI'
import { BASIC_FEE_RATE, PRO_HUB_FEE_RATE } from '@/src/config/platformFees'
import { ORGANIZER_HUB_MONTHLY_USD } from '@/src/config/subscriptions'

export const metadata: Metadata = {
  title: 'Organizer Guide | FxD Events',
  description: 'Create events and roles on FxD Events, invite contractors, hire, and pay through Stripe.',
}

const TOC: TocItem[] = [
  { id: 'profile', label: 'Create your profile' },
  { id: 'plans', label: 'Payments and plans' },
  { id: 'events', label: 'Create an event' },
  { id: 'private-events', label: 'Private events' },
  { id: 'roles', label: 'Add roles' },
  { id: 'invites', label: 'Invite contractors' },
  { id: 'funding', label: 'Hire and pay' },
  { id: 'release', label: 'Log hours and release payment' },
  { id: 'reviews', label: 'Ratings and reviews' },
]

const pct = (r: number) => `${Math.round(r * 100)}%`
const usd = (n: number) => `$${n.toFixed(2)}`

// Worked example for the fee table: an hourly role at $25 × 8 hours.
const EXAMPLE_LABOR = 25 * 8
// Monthly labor at which Organizer Hub's lower fee covers its subscription price.
const BREAK_EVEN_LABOR = Math.round(ORGANIZER_HUB_MONTHLY_USD / (BASIC_FEE_RATE - PRO_HUB_FEE_RATE))

export default function OrganizerGuidePage() {
  return (
    <HelpShell
      active="/help/organizers"
      title="Organizer guide"
      toc={TOC}
      intro={
        <p>
          An event holds one or more roles. Contractors apply to roles, and you pay for each hire when you hire them.
          Stripe holds the payment until you release it after the work is done.
        </p>
      }
    >
      <Section id="profile" n={1} title="Create your organizer profile">
        <Steps>
          <li>Sign up at fxdevents.com.</li>
          <li>
            <UI>The Basics:</UI> add your logo or photo, your name and mobile phone. Set Account type to{' '}
            <UI>Event Organizer</UI>, confirm you’re 18 or older, then select <UI>Continue</UI>.
          </li>
          <li><UI>Your Location:</UI> enter your city and state.</li>
          <li>
            <UI>The Pitch:</UI> describe your company: the events you run, their typical size, and what it’s like to work
            for you. Contractors read this before they apply or accept an invite.
          </li>
        </Steps>
      </Section>

      <Section id="plans" n={2} title="Payments and plans">
        <p>
          You don’t need your own Stripe account to hire. You pay for each hire by card through Stripe’s secure checkout.
          A platform fee is added on top of labor; the contractor always receives 100% of the labor amount.
        </p>
        <Bullets>
          <li><UI>Basic ($0):</UI> a {pct(BASIC_FEE_RATE)} platform fee on labor.</li>
          <li>
            <UI>Organizer Hub (${ORGANIZER_HUB_MONTHLY_USD}/month):</UI> the fee drops to {pct(PRO_HUB_FEE_RATE)}. Subscribe
            from <NextLink href="/pricing">Pricing</NextLink>, and manage or cancel it from your Dashboard with{' '}
            <UI>Manage Billing</UI>.
          </li>
        </Bullets>
        <Tip>
          Organizer Hub pays for itself once you hire about ${BREAK_EVEN_LABOR.toLocaleString()} of labor a month.
        </Tip>
      </Section>

      <Section id="events" n={3} title="Create an event">
        <Steps>
          <li>On your <UI>Dashboard</UI>, select <UI>Create New Event</UI>.</li>
          <li>Enter the event name, location, event date and total labor budget.</li>
          <li>Choose <UI>Visibility</UI>: Public or Private (next step).</li>
          <li>Select <UI>Create Event &amp; Start Staffing</UI>.</li>
          <li>
            Open the event and select <UI>Edit</UI> to add a description, official website, end date and an on-site point
            of contact.
          </li>
        </Steps>
        <p>
          The labor budget is your planning number. The event page shows how much is allocated to roles and how much
          remains.
        </p>
      </Section>

      <Section id="private-events" n={4} title="Create a private event">
        <p>
          Set Visibility to <UI>Private</UI> when you create the event, or <UI>Private (Invite Only)</UI> when you edit
          it. Private events and their roles are hidden from the Job Board. Only contractors you invite can see and apply.
        </p>
        <p>
          Use private events for repeat crews, client-confidential events or roles you’ve already filled by word of
          mouth. You can switch an event between public and private at any time from <UI>Edit</UI>.
        </p>
      </Section>

      <Section id="roles" n={5} title="Add roles to the event">
        <p>
          Each role is one position, such as “Finish Line Lead” or “Timer (Race Result)”. Add one role for each type of
          work.
        </p>
        <Steps>
          <li>On the event page, under <UI>Staffing &amp; Applicants</UI>, select <UI>Create New Role</UI>.</li>
          <li>Enter a title, start and end date, location and a description of duties and requirements.</li>
          <li>Choose <UI>Pay Type</UI>: <UI>Hourly</UI> (rate × estimated hours) or <UI>Flat Rate</UI>.</li>
          <li>Enter the rate and, for hourly roles, estimated hours. Then select <UI>Save Role</UI>.</li>
        </Steps>
        <Tip tone="warn">
          Pay terms lock once a payment is held for the role. You can’t delete a role while a payment is held; release
          or refund it first.
        </Tip>
      </Section>

      <Section id="invites" n={6} title="Invite contractors to apply">
        <Steps>
          <li>
            Select <UI>Invite</UI> at the top of the event (invites them to the event) or next to a role (invites them to
            that role).
          </li>
          <li>Search by name and select the contractor.</li>
          <li>They get an email and a notification with the role, date, location and pay, and a direct link to apply.</li>
        </Steps>
        <p>
          You’ll be told when they apply (“Invitation Accepted”) or decline. Invited contractors can apply even if
          they’ve reached the Basic monthly application limit. Use <UI>Message</UI> to talk with any applicant before you
          hire.
        </p>
      </Section>

      <Section id="funding" n={7} title="Hire and pay">
        <Steps>
          <li>
            Open the role’s applicants and select <UI>Hire &amp; Pay ($X)</UI> next to the contractor. The amount is labor
            plus the platform fee.
          </li>
          <li>
            Pay by card in Stripe Checkout. You’ll see “Payment received!” and the hire shows <UI>Payment Held</UI>.
          </li>
          <li>If you hired someone before paying, select <UI>Fund Payment</UI> to pay.</li>
        </Steps>
        <p>
          You can only hire contractors who have finished Stripe payout setup. If one hasn’t, ask them to select{' '}
          <UI>Setup Payouts &amp; W-9</UI> on their dashboard (
          <NextLink href="/help/contractors#stripe">how contractors set up payouts</NextLink>).
        </p>
        <Table
          head={[`Example: hourly role, $25/hour × 8 estimated hours`, 'Basic', 'Organizer Hub']}
          rows={[
            ['Labor (goes to the contractor)', usd(EXAMPLE_LABOR), usd(EXAMPLE_LABOR)],
            [
              'Platform fee',
              `${usd(EXAMPLE_LABOR * BASIC_FEE_RATE)} (${pct(BASIC_FEE_RATE)})`,
              `${usd(EXAMPLE_LABOR * PRO_HUB_FEE_RATE)} (${pct(PRO_HUB_FEE_RATE)})`,
            ],
            [
              'You pay at hire',
              usd(EXAMPLE_LABOR * (1 + BASIC_FEE_RATE)),
              usd(EXAMPLE_LABOR * (1 + PRO_HUB_FEE_RATE)),
            ],
          ]}
        />
      </Section>

      <Section id="release" n={8} title="Log hours and release payment">
        <Steps>
          <li>
            After the event, select <UI>Log Hours</UI> on an hourly hire and enter the actual hours worked. The final
            payout can’t be more than the amount held.
          </li>
          <li>Select <UI>Release Payout</UI> and confirm. This can’t be undone.</li>
          <li>
            The contractor gets their labor amount. If they worked fewer hours than estimated, the unused labor and its
            fee are refunded to your card.
          </li>
        </Steps>
        <p>
          Stripe moves the money to the contractor once your payment settles, usually about 2 business days. Every
          payment is listed under <UI>Payouts</UI>.
        </p>
      </Section>

      <Section id="reviews" n={9} title="Ratings and reviews">
        <p>
          When a job is finished and paid, you and the contractor rate each other from 1 to 5 stars and can leave a
          written review. Ratings show on profiles and search results, and help good contractors get hired again.
        </p>
        <Bullets>
          <li>
            On the event page, the hire shows <UI>✓ Paid</UI> after you release payment. Select <UI>Rate</UI> next to it.
          </li>
          <li>Cover punctuality, skill, attitude, and whether you’d hire them again.</li>
        </Bullets>
        <Tip>
          Good reviews are specific: “Arrived 30 minutes early and ran the finish chute alone for 4 hours” helps more
          than “Great job!”. Review only work you were part of.
        </Tip>
        <p>
          Next: see the contractor side in the <NextLink href="/help/contractors">contractor guide</NextLink>, or read
          the <NextLink href="/help#faq">FAQ</NextLink>.
        </p>
      </Section>
    </HelpShell>
  )
}

import type { Metadata } from 'next'
import { HelpShell, Section, Steps, Bullets, UI, Tip, Table, NextLink, type TocItem } from '@/src/components/help/HelpUI'
import { ROLE_CATEGORIES } from '@/src/config/roles'
import { BASIC_MONTHLY_APPLICATIONS, CONTRACTOR_PRO_MONTHLY_USD } from '@/src/config/subscriptions'

export const metadata: Metadata = {
  title: 'Contractor Guide | FxD Events',
  description: 'Build your FxD Events profile, set up Stripe payouts, apply for event roles and get paid.',
}

const TOC: TocItem[] = [
  { id: 'profile', label: 'Create your profile' },
  { id: 'skills', label: 'Select your skills' },
  { id: 'bio', label: 'Write your bio' },
  { id: 'stripe', label: 'Set up payouts' },
  { id: 'apply', label: 'Find and apply for jobs' },
  { id: 'invites', label: 'Accept an invitation' },
  { id: 'paid', label: 'Work the job and get paid' },
  { id: 'reviews', label: 'Ratings and reviews' },
]

export default function ContractorGuidePage() {
  return (
    <HelpShell
      active="/help/contractors"
      title="Contractor guide"
      toc={TOC}
      intro={
        <p>
          A complete profile and a connected Stripe payout account are the two things that get you hired and paid. Do
          both before you apply.
        </p>
      }
    >
      <Section id="profile" n={1} title="Create your profile">
        <p>Sign up at fxdevents.com, then complete the three setup steps.</p>
        <Steps>
          <li>
            <UI>The Basics.</UI> Add a photo, your full name and mobile phone. Set Account type to{' '}
            <UI>Event Professional</UI>. Enter an invite code if someone referred you. Confirm you are 18 or older, then
            select <UI>Continue</UI>.
          </li>
          <li>
            <UI>Your Expertise.</UI> Enter your city and state, then select your skills (next step). Select <UI>Next</UI>.
          </li>
          <li>
            <UI>The Pitch.</UI> Write your bio (see the recommended format below) and save. You’ll land on the Job Board.
          </li>
        </Steps>
        <Tip>Use a clear, recent headshot. Organizers see your photo, name, rating and skills first.</Tip>
      </Section>

      <Section id="skills" n={2} title="Select your skills">
        <p>
          Skills are how organizers find you in search and invites. Select only roles you can do on your own on event
          day.
        </p>
        <Table
          head={['Category', 'Roles']}
          rows={Object.entries(ROLE_CATEGORIES).map(([category, roles]) => [category, roles.join(', ')])}
        />
        <p>
          Name the exact system for timing and registration roles. Organizers usually need someone who already knows
          their platform. You can change your skills any time from <UI>Edit Profile</UI>.
        </p>
      </Section>

      <Section id="bio" n={3} title="Write your bio">
        <p>Keep it to 4 to 6 sentences. Organizers skim, so lead with what you do and how much you’ve done.</p>
        <Steps>
          <li><UI>Who you are:</UI> your main role and years of experience.</li>
          <li><UI>Proof:</UI> the number and type of events you’ve worked, with one or two names if you can share them.</li>
          <li><UI>Tools and certifications:</UI> timing systems, CDL, forklift certification, first aid.</li>
          <li><UI>Availability:</UI> your home city and how far you’ll travel.</li>
          <li><UI>What you’re like on site:</UI> one line on reliability or how you work with crews.</li>
        </Steps>
        <blockquote className="border-l-4 border-secondary bg-slate-50 rounded-r-xl px-5 py-4 italic text-slate-700">
          “Race timer and finish line lead with 8 years in endurance events. I’ve timed 120+ races, from 5Ks to full
          marathons. Certified on Mylaps and Race Result, and I bring my own mats and decoders. Based in Austin and happy
          to travel across Texas. I arrive early, test twice and stay until results are final.”
        </blockquote>
        <p>
          Don’t list every skill again, and don’t include your phone or email. Organizers contact you through FxD Events
          messages.
        </p>
      </Section>

      <Section id="stripe" n={4} title="Set up payouts with Stripe">
        <p>
          You can’t be hired until your payout account is set up. Until then, organizers see “This contractor hasn’t set
          up their payouts yet” and can’t pay you.
        </p>
        <Steps>
          <li>Go to your <UI>Dashboard</UI> and select <UI>Setup Payouts &amp; W-9</UI>.</li>
          <li>
            Stripe opens a secure form. Enter your legal name, date of birth, address, SSN or EIN (for your W-9), and the
            bank account for deposits.
          </li>
          <li>
            When you finish, Stripe returns you to FxD Events. The button changes to <UI>View Stripe Dashboard</UI>, where
            you can see your balance, payouts and tax forms.
          </li>
        </Steps>
        <Tip>
          FxD Events never sees your bank details or SSN; Stripe stores them. If you leave setup partway, return with the
          same <UI>Setup Payouts &amp; W-9</UI> button to finish.
        </Tip>
      </Section>

      <Section id="apply" n={5} title="Find and apply for jobs">
        <Steps>
          <li>Open <UI>Find Work</UI> (the Job Board) and filter by role, date or location.</li>
          <li>Open a job to see the event, dates, rate (hourly or flat), estimated hours and description.</li>
          <li>Agree to the job terms and select <UI>Apply for this Position</UI>. You’ll see “Application Sent!”</li>
          <li>Track every application under <UI>My Applications</UI>.</li>
        </Steps>
        <p>
          Basic accounts can send {BASIC_MONTHLY_APPLICATIONS} applications a month. Contractor Pro ($
          {CONTRACTOR_PRO_MONTHLY_USD}/month) is unlimited. Applications to jobs you were invited to don’t count toward
          the limit. See <NextLink href="/pricing">Pricing</NextLink>.
        </p>
        <p>Use <UI>Message</UI> to ask the organizer a question before or after you apply.</p>
      </Section>

      <Section id="invites" n={6} title="Accept an invitation">
        <p>
          Organizers can invite you to an event or a specific role, including private, invite-only events. You’ll get an
          email and an in-app notification with the role, date, location and pay.
        </p>
        <Bullets>
          <li>
            Select <UI>View &amp; Apply</UI> to open the job, then apply as above. Applying accepts the invitation, and the
            organizer is told.
          </li>
          <li>Select <UI>Decline</UI> if you can’t make it. The organizer is told so they can find someone else.</li>
        </Bullets>
      </Section>

      <Section id="paid" n={7} title="Work the job and get paid">
        <Steps>
          <li>
            When the organizer hires you, they pay up front. Stripe holds the payment, and you get a “You’re hired” email.
          </li>
          <li>Work the shift. For hourly roles, the organizer logs your actual hours after the event.</li>
          <li>
            The organizer selects <UI>Release Payout</UI>. You receive 100% of the labor amount; the platform fee is paid
            by the organizer, not you.
          </li>
          <li>
            The money reaches your Stripe balance once the organizer’s payment settles, usually about 2 business days.
            Stripe then deposits it to your bank on your payout schedule. Your first payout can take a few extra days
            while Stripe verifies your account.
          </li>
        </Steps>
        <p>Every payment you’ve received is listed under <UI>Payouts</UI>.</p>
      </Section>

      <Section id="reviews" n={8} title="Ratings and reviews">
        <p>
          When a job is finished and paid, you and the organizer rate each other from 1 to 5 stars and can leave a
          written review. Ratings show next to your name on applications, search results and your profile, so they
          decide who gets hired next.
        </p>
        <Bullets>
          <li>
            To review an organizer, go to <UI>My Applications</UI> and select <UI>Write Review</UI> on a paid job.
          </li>
          <li>Cover clear instructions, on-site support, on-time pay, and whether you’d work for them again.</li>
        </Bullets>
        <Tip>
          Good reviews are specific and factual. Review only work you were part of, and don’t offer or accept anything in
          exchange for a review.
        </Tip>
        <p>
          Next: see how organizers hire in the <NextLink href="/help/organizers">organizer guide</NextLink>, or read the{' '}
          <NextLink href="/help#faq">FAQ</NextLink>.
        </p>
      </Section>
    </HelpShell>
  )
}

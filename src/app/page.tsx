import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-secondary selection:text-primary">

      {/* HERO SECTION (site-wide Navbar with the logo comes from layout.tsx) */}
      <section className="pt-20 md:pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 text-primary text-xs font-black uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Now open for Event Professionals
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-primary tracking-tight mb-8 leading-[1.1]">
            The new standard for <br />
            <span className="text-secondary">event staffing.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with top-tier local talent, manage shifts, and pay securely through Stripe.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login?mode=signup" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-hover transition-all shadow-lg">
              I need to hire staff
            </Link>
            <Link href="/jobs" className="w-full sm:w-auto px-8 py-4 bg-secondary text-primary rounded-xl font-bold text-lg hover:bg-secondary-hover transition-all shadow-lg">
              I am looking for gigs
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE PROPS GRID */}
      <section className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-primary">Why trust FxD Events?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-primary">Payment Up Front</h3>
              <p className="text-slate-500 leading-relaxed">Organizers pay when they hire, and Stripe holds the payment until the organizer releases it after the work is done. Talent knows the money has been set aside before the shift begins.</p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-primary">Fast Payouts</h3>
              <p className="text-slate-500 leading-relaxed">No more chasing invoices or waiting 30 days for a check. Once the organizer confirms your hours, your pay is released to your Stripe account and deposited to your bank on Stripe&apos;s regular payout schedule.</p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-primary">Hire With Confidence</h3>
              <p className="text-slate-500 leading-relaxed">Browse profiles, check reviews from past organizers, and view portfolios before hiring. Upgrade to Pro to get featured placement on the job board.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DUAL AUDIENCE SPLIT */}
      <section className="py-24 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-secondary font-black tracking-widest uppercase text-xs mb-4 block">For Organizers</span>
            <h2 className="text-4xl font-black mb-6">Staff your entire event in hours, not weeks.</h2>
            <ul className="space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-sm">✓</div>
                Post public gigs to the discovery board
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-sm">✓</div>
                Review applications and chat with candidates
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-sm">✓</div>
                Pay securely by card through Stripe
              </li>
            </ul>
            <Link href="/login?mode=signup" className="inline-block bg-secondary text-primary font-bold px-6 py-3 rounded-lg hover:bg-secondary-hover transition-colors">
              Create Organizer Account
            </Link>
          </div>

          <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
             <span className="text-secondary font-black tracking-widest uppercase text-xs mb-4 block">For Contractors</span>
             <h2 className="text-3xl font-black mb-6">Know the money is there before you work.</h2>
             <p className="text-slate-300 mb-8 leading-relaxed">
               When you&apos;re hired on FxD Events, the organizer pays up front and Stripe holds the payment. Once the organizer confirms your hours, it&apos;s released to your Stripe account and paid out to your bank.
             </p>
             <div className="bg-primary p-6 rounded-2xl border border-white/10">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-sm font-bold text-slate-300">Payout Released</span>
                 <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">Success</span>
               </div>
               <div className="text-3xl font-black text-white">$450.00</div>
               <p className="text-xs text-slate-400 mt-2">Example payout to a bank account ending in •••• 4242</p>
             </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="flex items-center">
            <Image src="/fxd-v2.png" alt="FxD Events" width={120} height={65} className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex gap-6 text-sm font-bold text-slate-400">
            <Link href="/jobs" className="hover:text-primary transition-colors">Job Board</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="/help" className="hover:text-primary transition-colors">Help</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
          </div>
          <p className="text-sm text-slate-400">© 2026 FxD Events. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

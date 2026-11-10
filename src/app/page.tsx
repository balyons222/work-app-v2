import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xl leading-none">F</span>
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">FxD Events</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
            <Link href="/jobs" className="hover:text-indigo-600 transition-colors">Find Gigs</Link>
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <Link href="/login" className="hover:text-slate-900 transition-colors">Log In</Link>
            <Link href="/login" className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-sm">
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Now open for Event Professionals
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1]">
            The new standard for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              event staffing.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Connect with top-tier local talent, manage shifts, and handle payments securely through our automated escrow engine. 
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200">
              I need to hire staff
            </Link>
            <Link href="/jobs" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
              I am looking for gigs
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE PROPS GRID */}
      <section className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900">Why trust FxD Events?</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Escrow Protection</h3>
              <p className="text-slate-500 leading-relaxed">Funds are securely locked in Stripe Escrow before the shift begins. Organizers know the talent is committed, and talent knows the money is guaranteed.</p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Instant Payouts</h3>
              <p className="text-slate-500 leading-relaxed">No more chasing invoices or waiting 30 days for a check. When the gig is done, payouts are routed instantly to the contractor's connected bank account.</p>
            </div>
            
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Vetted Talent</h3>
              <p className="text-slate-500 leading-relaxed">Browse verified profiles, check past reviews, and view portfolios before hiring. Upgrade to Pro to get featured placement on the job board.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DUAL AUDIENCE SPLIT */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-emerald-400 font-black tracking-widest uppercase text-xs mb-4 block">For Organizers</span>
            <h2 className="text-4xl font-black mb-6">Staff your entire event in hours, not weeks.</h2>
            <ul className="space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div>
                Post public gigs to the discovery board
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div>
                Review applications and chat with candidates
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div>
                Fund escrow via credit card safely via Stripe
              </li>
            </ul>
            <Link href="/login" className="inline-block bg-emerald-500 text-slate-900 font-bold px-6 py-3 rounded-lg hover:bg-emerald-400 transition-colors">
              Create Organizer Account
            </Link>
          </div>
          
          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
             <span className="text-indigo-400 font-black tracking-widest uppercase text-xs mb-4 block">For Contractors</span>
             <h2 className="text-3xl font-black mb-6">Never worry about getting paid again.</h2>
             <p className="text-slate-400 mb-8 leading-relaxed">
               When you get hired on FxD Events, the client's money is locked in our secure escrow vault. The moment the event ends, your payout is automatically released to your bank account.
             </p>
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-sm font-bold text-slate-300">Payout Released</span>
                 <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">Success</span>
               </div>
               <div className="text-3xl font-black text-white">$450.00</div>
               <p className="text-xs text-slate-500 mt-2">Transferred to Chase Bank ending in •••• 4242</p>
             </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white font-black text-xs leading-none">F</span>
            </div>
            <span className="font-bold text-slate-900">FxD Events</span>
          </div>
          <div className="flex gap-6 text-sm font-bold text-slate-400">
            <Link href="/jobs" className="hover:text-slate-900 transition-colors">Job Board</Link>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
          </div>
          <p className="text-sm text-slate-400">© 2026 FxD Events. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
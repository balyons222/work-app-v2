import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0B0E2A] text-white overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />

      <div className="relative z-10 max-w-4xl px-4 text-center">
        {/* Badge */}
        <div className="inline-block px-4 py-1 mb-8 border border-slate-700 rounded-full bg-slate-900/50 backdrop-blur-sm">
          <span className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
            Exclusive Event Staffing Network
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6">
          Work=<span className="text-secondary italic">FxD.</span>
        </h1>

        {/* Sub-headline Copy from Image */}
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-12">
          Directly connect with operations professionals, technology experts, and marketing 
          specialists for large-scale endurance and live events.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/login?mode=signup"
            className="w-full sm:w-auto px-10 py-4 bg-secondary hover:bg-teal-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            Hire Talent
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          
          <Link 
            href="/login?mode=signup"
            className="w-full sm:w-auto px-10 py-4 bg-white/5 hover:bg-white/10 border border-slate-700 text-white font-bold rounded-xl transition-all"
          >
            Join FxD
          </Link>
        </div>
      </div>

      {/* Trust Bar Footer (Optional) */}
      <div className="absolute bottom-12 w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">
          Trusted by staff at major productions
        </p>
      </div>
    </div>
  )
}
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-primary text-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm">
        <p>&copy; {new Date().getFullYear()} FxD Events. WORK = F x D.</p>
        <nav className="flex gap-5 text-slate-300">
          <Link href="/help" className="hover:text-white transition-colors">Help</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </nav>
      </div>
    </footer>
  )
}

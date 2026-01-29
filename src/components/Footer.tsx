import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-blue-600 mb-4">GigMarket</h3>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              The safest way to find local work or hire reliable help for your next event. Built with trust and transparency.
            </p>
          </div>

          {/* Column 2: Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/jobs" className="hover:text-blue-600">Browse Jobs</Link></li>
              <li><Link href="/auth?role=worker" className="hover:text-blue-600">Become a Worker</Link></li>
              <li><Link href="/auth?role=organizer" className="hover:text-blue-600">Post a Job</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal/Social */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><span className="cursor-not-allowed opacity-50">Help Center</span></li>
              <li><span className="cursor-not-allowed opacity-50">Privacy Policy</span></li>
              <li><span className="cursor-not-allowed opacity-50">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} GigMarket Inc. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
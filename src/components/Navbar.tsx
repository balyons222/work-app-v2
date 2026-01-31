'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client' // Adjusted path to be safe

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20"> {/* Increased height slightly for logo */}
          
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
<Image 
  src="/fxd-v2.png"
  alt="FxD Events" 
  width={150} 
  height={50} 
  className="h-12 w-auto object-contain"
  priority
/>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/search" className="text-primary hover:text-secondary font-semibold transition-colors">
              Find Talent
            </Link>
            <Link href="/jobs/new" className="text-primary hover:text-secondary font-semibold transition-colors">
              Post a Job
            </Link>
            
            {user ? (
              <div className="flex items-center gap-6">
                <Link href="/messages" className="text-primary hover:text-secondary font-semibold transition-colors">
                  Messages
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="bg-secondary hover:bg-teal-600 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-primary hover:text-secondary font-semibold transition-colors">
                  Log In
                </Link>
                <Link href="/login" className="bg-primary hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm hover:shadow-md">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-primary hover:text-secondary focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger Icon */}
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Hidden on Desktop) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="/search" 
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-secondary hover:bg-slate-50"
              onClick={() => setIsOpen(false)}
            >
              Find Talent
            </Link>
            <Link 
              href="/jobs/new" 
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-secondary hover:bg-slate-50"
              onClick={() => setIsOpen(false)}
            >
              Post a Job
            </Link>
            
            {user ? (
              <>
                <Link 
                  href="/messages" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-secondary hover:bg-slate-50"
                  onClick={() => setIsOpen(false)}
                >
                  Messages
                </Link>
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-slate-50"
                onClick={() => setIsOpen(false)}
              >
                Sign In / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
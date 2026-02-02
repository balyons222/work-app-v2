'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

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
        <div className="flex justify-between h-20">
          
          {/* Logo */}
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
            <Link href="/jobs" className="text-primary hover:text-secondary font-semibold transition-colors">
  Find Work
</Link>
            <Link href="/jobs/new" className="text-primary hover:text-secondary font-semibold transition-colors">
              Post a Job
            </Link>
            
            {user ? (
              <>
                <Link href="/messages" className="text-primary hover:text-secondary font-semibold transition-colors">
                  Messages
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="bg-secondary hover:bg-teal-600 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-primary hover:text-secondary font-semibold transition-colors">
                  Log In
                </Link>
                <Link href="/login" className="bg-primary hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-primary"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-4">
          <Link href="/search" className="block text-primary font-medium">Find Talent</Link>
          <Link href="/jobs" className="block text-primary font-medium">Find Work</Link>
          <Link href="/jobs/new" className="block text-primary font-medium">Post a Job</Link>
          <hr />
          {user ? (
            <button onClick={handleSignOut} className="text-red-600 font-medium">Sign Out</button>
          ) : (
            <Link href="/login" className="block text-primary font-medium">Log In / Sign Up</Link>
          )}
        </div>
      )}
    </nav>
  )
}

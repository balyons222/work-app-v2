'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../utils/supabase/client'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const isHome = pathname === '/'

  useEffect(() => {
    const getAuthAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }
    }

    getAuthAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getAuthAndProfile()
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push('/')
    router.refresh()
  }

  // Define exactly how the links should look based on the page
  const navBgClass = isHome 
    ? 'bg-transparent border-transparent' 
    : 'bg-white border-slate-200 shadow-sm'

  // This is the fix: Explicitly forcing text-white for the homepage
  const linkTextClass = isHome 
    ? 'text-white hover:text-secondary' 
    : 'text-primary hover:text-secondary'

  return (
    <nav className={`${navBgClass} border-b sticky top-0 z-50 transition-all duration-300`}>
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
                className={`h-12 w-auto object-contain transition-all ${isHome ? 'invert brightness-200' : ''}`} 
                priority 
              />
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/search" className={`${linkTextClass} font-semibold transition-colors`}>
              Find Talent
            </Link>
            <Link href="/jobs" className={`${linkTextClass} font-semibold transition-colors`}>
              Find Work
            </Link>
            
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-slate-500/30">
                <p className={`text-sm font-bold leading-none ${isHome ? 'text-white' : 'text-primary'}`}>
                  {profile?.full_name || 'User'}
                </p>
                <button 
                  onClick={handleSignOut}
                  className="bg-secondary hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-6">
                <Link href="/login" className={`${linkTextClass} font-semibold transition-colors`}>
                  Log In
                </Link>
                <Link 
                  href="/login?mode=signup" 
                  className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition-all border border-slate-700/50"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Error logging out')
    } else {
      toast.success('Logged out successfully')
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">W</span>
              </div>
              <span className="font-bold text-xl tracking-tight">WorkApp</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/jobs" className="text-sm font-medium text-gray-500 hover:text-black transition">
              Find Work
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-black transition">
              Dashboard
            </Link>
            <Link href="/my-applications" className="text-sm font-medium text-gray-500 hover:text-black transition">
              My Applications
            </Link>
            <Link href="/profile" className="text-sm font-medium text-gray-500 hover:text-black transition">
              Profile
            </Link>
            <Link href="/messages" className="text-sm font-medium text-gray-500 hover:text-black transition">
  Messages
</Link>
            
            {/* LOGOUT BUTTON (Desktop) */}
            <button 
              onClick={handleLogout} 
              className="text-sm font-bold text-red-500 hover:text-red-700 transition"
            >
              Log Out
            </button>
          </div>

          {/* Mobile Menu Button (Hamburger) */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-black hover:bg-gray-100 focus:outline-none"
            >
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

      {/* Mobile Menu (Dropdown) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="/jobs" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Find Work
            </Link>
            <Link 
              href="/dashboard" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/my-applications" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              My Applications
            </Link>
            <Link 
              href="/profile" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
            <Link 
  href="/messages" 
  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-md"
  onClick={() => setIsOpen(false)}
>
  Messages
</Link>
            
            {/* LOGOUT BUTTON (Mobile) */}
            <button 
              onClick={() => {
                setIsOpen(false)
                handleLogout()
              }}
              className="w-full text-left block px-3 py-2 text-base font-bold text-red-500 hover:bg-red-50 rounded-md"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
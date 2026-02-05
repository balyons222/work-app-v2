'use client'

import { useState, Suspense } from 'react'
import { createClient } from '../../utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        // --- SIGN UP LOGIC ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Fixes "window is undefined" error on server
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        toast.success('Check your email to confirm account!')
      } else {
        // --- LOG IN LOGIC ---
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        if (user) {
          toast.success('Welcome back!')
          checkProfileAndRedirect(user.id)
        }
      }
    } catch (error: any) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  // 🧠 SMART REDIRECT LOGIC
  const checkProfileAndRedirect = async (userId: string) => {
    try {
      // Check if a profile row exists for this user
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .maybeSingle() // 'maybeSingle' avoids errors if no row exists

      if (profile && profile.full_name) {
        // ✅ Profile Exists -> Go to their hub
        if (profile.role === 'contractor') {
          router.push('/jobs')
        } else {
          router.push('/dashboard')
        }
      } else {
        // ❌ No Profile -> Go to Setup
        router.push('/setup-profile')
      }
    } catch (err) {
      // Fallback if DB check fails
      router.push('/dashboard')
    } finally {
      // We don't set loading false here because we are navigating away
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary mb-2">
            {mode === 'signup' ? 'Join the Crew' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500">
            {mode === 'signup' ? 'Create your account to get started' : 'Sign in to access your dashboard'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-medium"
              placeholder="you@example.com"
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-medium"
              placeholder="••••••••"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-medium text-slate-500">
          {mode === 'signup' ? (
            <p>Already have an account? <Link href="/login" className="text-secondary font-bold hover:underline">Sign In</Link></p>
          ) : (
            <p>New here? <Link href="/login?mode=signup" className="text-secondary font-bold hover:underline">Create Account</Link></p>
          )}
        </div>
      </div>
    </div>
  )
}

// Suspense wrapper to prevent client-side build errors
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

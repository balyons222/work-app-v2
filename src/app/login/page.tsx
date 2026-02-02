'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation' 
import Link from 'next/link'
import toast from 'react-hot-toast'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
const origin = typeof window !== 'undefined' ? window.location.origin : ''

const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
  },
})
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        })
        
        if (error) {
          toast.error(error.message)
        } else {
          toast.success('Account created! Let’s set up your profile.')
          router.push('/setup-profile')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        
        if (error) {
          toast.error(error.message)
        } else {
          toast.success('Logged in successfully!')
          router.push('/setup-profile')
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">FxD</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {isSignUp ? 'Create an account' : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="font-medium text-secondary hover:underline"
          >
            {isSignUp ? 'log in instead' : 'create a new account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-secondary focus:border-secondary sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-secondary focus:border-secondary sm:text-sm"
              />
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-end">
                <Link href="/forgot-password" title="Forgot Password" className="text-sm text-secondary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function checkPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setCurrentPlan(profile.plan_tier || 'free')
        }
      }
    }
    checkPlan()
  }, [supabase])

  // 1. UPDATED: Now accepts both variables dynamically
  const handleCheckout = async (priceId: string, targetRole: string) => {
    setLoading(true)
    const toastId = toast.loading('Redirecting to secure checkout...')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in to upgrade.', { id: toastId })
        router.push('/login')
        return
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 2. UPDATED: Sending both variables to the backend
        body: JSON.stringify({ priceId, targetRole }), 
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to create checkout session.', { id: toastId })
        setLoading(false)
      }

    } catch (error) {
      toast.error('Something went wrong.', { id: toastId })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center mb-16">
          <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 mb-8 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Level up your <span className="text-indigo-600">EventStaff</span> career.
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Whether you are picking up occasional weekend shifts or running a full-time event business, we have a plan that fits your goals.
          </p>
        </div>

        {/* 3. UPDATED: Expanded to a 3-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* FREE TIER CARD */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Basic</h3>
              <p className="text-slate-500 text-sm h-10">Everything you need to get started and apply to local gigs.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">$0</span>
                <span className="text-slate-500 font-medium">/month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="Apply to unlimited open jobs" />
              <FeatureItem text="Standard search visibility" />
              <FeatureItem text="Up to 3 portfolio images" />
            </div>

            <button 
              disabled={currentPlan === 'free'}
              className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade to Basic'}
            </button>
          </div>

          {/* CONTRACTOR TIER CARD */}
          <div className="bg-indigo-900 rounded-3xl p-8 border border-indigo-700 shadow-2xl flex flex-col relative transform md:-translate-y-4">
            <div className="absolute -top-4 left-0 right-0 flex justify-center">
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
                For Staff
              </span>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Contractor Pro</h3>
              <p className="text-indigo-200 text-sm h-10">Stand out to top-tier clients and showcase your full expertise.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">$19</span>
                <span className="text-indigo-200 font-medium">/month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="Featured badge on your profile" dark />
              <FeatureItem text="Priority placement in Organizer searches" dark />
              <FeatureItem text="Up to 10 high-res portfolio images" dark />
              <FeatureItem text="Directly pitch organizers (Skip the line)" dark />
            </div>

            <button 
              // 4. UPDATED: Passing Contractor strings
              onClick={() => handleCheckout('price_1UYRqLPzkSWzkzs9bIjfQMyN', 'contractor')}
              disabled={currentPlan === 'contractor' || loading}
              className="w-full py-4 rounded-xl font-black text-indigo-900 bg-white hover:bg-indigo-50 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : currentPlan === 'contractor' ? 'Active Subscription' : 'Upgrade to Contractor'}
            </button>
          </div>

          {/* ORGANIZER TIER CARD */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl flex flex-col relative">
            <div className="absolute -top-4 left-0 right-0 flex justify-center">
              <span className="bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
                For Businesses
              </span>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Organizer Hub</h3>
              <p className="text-slate-400 text-sm h-10">Post jobs, manage shifts, and recruit top local talent seamlessly.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">$49</span>
                <span className="text-slate-400 font-medium">/month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="Post unlimited event shifts" dark />
              <FeatureItem text="Advanced talent filtering & search" dark />
              <FeatureItem text="Bulk messaging to candidates" dark />
              <FeatureItem text="Applicant tracking dashboard" dark />
            </div>

            <button 
              // 5. UPDATED: Passing Organizer strings
              onClick={() => handleCheckout('price_1UYRqtPzkSWzkzs9F5pRTrHg', 'organizer')}
              disabled={currentPlan === 'organizer' || loading}
              className="w-full py-4 rounded-xl font-black text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : currentPlan === 'organizer' ? 'Active Subscription' : 'Upgrade to Organizer'}
            </button>
          </div>

        </div>

        <div className="mt-20 text-center">
          <p className="text-sm text-slate-500 font-medium flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Secure payment processing powered by Stripe. Cancel anytime.
          </p>
        </div>

      </div>
    </div>
  )
}

function FeatureItem({ text, dark = false }: { text: string, dark?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 rounded-full p-1 flex-shrink-0 ${dark ? 'bg-white/20 text-white' : 'bg-green-100 text-green-600'}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <span className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
        {text}
      </span>
    </div>
  )
}
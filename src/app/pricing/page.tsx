'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  BASIC_MONTHLY_APPLICATIONS, CONTRACTOR_PRO_MONTHLY_USD, ORGANIZER_HUB_MONTHLY_USD, isContractorPro, isOrganizerHub,
} from '@/src/config/subscriptions'
import { CONTRACTOR_PRO_PRICE_ID, ORGANIZER_HUB_PRICE_ID } from '@/src/config/stripePrices'
import { BASIC_FEE_RATE, PRO_HUB_FEE_RATE } from '@/src/config/platformFees'

const pct = (rate: number) => `${Math.round(rate * 100)}%`
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const FEE_SAVINGS = BASIC_FEE_RATE - PRO_HUB_FEE_RATE
// Example month for the Hub savings line, and the labor at which Hub pays for itself
const EXAMPLE_MONTHLY_LABOR = 7500
const BREAK_EVEN_LABOR = Math.ceil(ORGANIZER_HUB_MONTHLY_USD / FEE_SAVINGS / 100) * 100

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null) // null = signed out
  const supabase = createClient()
  const router = useRouter()

  const onPro = isContractorPro(currentPlan)
  const onHub = isOrganizerHub(currentPlan)
  const onBasic = currentPlan !== null && !onPro && !onHub

  const openBillingPortal = async () => {
    const toastId = toast.loading('Opening billing portal...')
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Billing portal is temporarily unavailable.')
    } catch (error: any) {
      toast.error(error?.message || 'Billing portal is temporarily unavailable.', { id: toastId })
    }
  }

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
          setCurrentPlan(profile.plan_tier || 'basic')
        }
      }
    }
    checkPlan()
  }, [supabase])

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

      // 1. Point to the 'subscribe' route we built
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The server derives the plan from priceId; targetRole is not sent
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session.', { id: toastId })
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
            Plans for <span className="text-indigo-600">event staff</span> and the businesses that hire them.
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Start free. Upgrade when you want to be seen first, or when you’re hiring every month and want lower fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* FREE TIER CARD */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Basic</h3>
              <p className="text-slate-500 text-sm h-10">Free to join, for staff and event businesses alike.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">$0</span>
                <span className="text-slate-500 font-medium">/month</span>
              </div>
            </div>

            <div className="flex-1 mb-8">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">For staff</p>
              <div className="space-y-3 mb-6">
                <FeatureItem text={`Apply to ${BASIC_MONTHLY_APPLICATIONS} jobs a month (invites don’t count)`} />
                <FeatureItem text="Listed in Find Talent" />
                <FeatureItem text="Up to 3 portfolio images" />
                <FeatureItem text="Secure payouts to your bank through Stripe" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">For businesses</p>
              <div className="space-y-3">
                <FeatureItem text="Post unlimited events and roles" />
                <FeatureItem text="Search talent by name, role, skill or location" />
                <FeatureItem text="Message and hire applicants one by one" />
                <FeatureItem text={`${pct(BASIC_FEE_RATE)} platform fee on hires`} />
              </div>
            </div>

            {onBasic || currentPlan === null ? (
              <button
                onClick={() => { if (currentPlan === null) router.push('/login') }}
                disabled={onBasic}
                className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {onBasic ? 'Current Plan' : 'Get started free'}
              </button>
            ) : (
              <button
                onClick={openBillingPortal}
                className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Manage or cancel plan
              </button>
            )}
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
              <p className="text-indigo-200 text-sm h-10">Get seen first and apply to as many jobs as you want.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">${CONTRACTOR_PRO_MONTHLY_USD}</span>
                <span className="text-indigo-200 font-medium">/month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="Unlimited job applications" dark />
              <FeatureItem text="Listed first in organizers’ Find Talent searches" dark />
              <FeatureItem text="Your applications appear at the top of the organizer’s list" dark />
              <FeatureItem text="Pro badge on your profile, search card and applications" dark />
              <FeatureItem text="Up to 10 portfolio images" dark />
            </div>

            <button
              onClick={() => handleCheckout(CONTRACTOR_PRO_PRICE_ID, 'contractor')}
              disabled={onPro || loading}
              className="w-full py-4 rounded-xl font-black text-indigo-900 bg-white hover:bg-indigo-50 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : onPro ? 'Active Subscription' : 'Upgrade to Contractor Pro'}
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
              <p className="text-slate-400 text-sm h-10">Lower fees and faster staffing for businesses that hire every month.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">${ORGANIZER_HUB_MONTHLY_USD}</span>
                <span className="text-slate-400 font-medium">/month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text={`${pct(PRO_HUB_FEE_RATE)} platform fee on hires instead of ${pct(BASIC_FEE_RATE)}`} dark />
              <FeatureItem text={`Save ${usd(EXAMPLE_MONTHLY_LABOR * FEE_SAVINGS)} a month on ${usd(EXAMPLE_MONTHLY_LABOR)} of labor. Pays for itself above about ${usd(BREAK_EVEN_LABOR)}`} dark />
              <FeatureItem text="Advanced talent filters: location, rating, jobs completed, rate, experience and travel" dark />
              <FeatureItem text="Bulk messaging: send call times and updates to everyone hired or applied in one step" dark />
            </div>

            <button
              onClick={() => handleCheckout(ORGANIZER_HUB_PRICE_ID, 'organizer')}
              disabled={onHub || loading}
              className="w-full py-4 rounded-xl font-black text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : onHub ? 'Active Subscription' : 'Upgrade to Organizer Hub'}
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
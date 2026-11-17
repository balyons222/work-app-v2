'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { ACH_MAX_CENTS } from '@/src/config/ach'

type Props = {
  bankStatus: string | null
  bankName: string | null
  bankLast4: string | null
  onChange: () => void // reload the profile after linking
}

// Organizer dashboard: link a business bank account for ACH hire payments.
// Only rendered for organizers an admin has switched bank payments on for.
export default function BankPaymentsCard({ bankStatus, bankName, bankLast4, onChange }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const confirmedRef = useRef(false)

  // Returning from Stripe's bank-linking page
  useEffect(() => {
    const bankParam = searchParams.get('bank')
    const sessionId = searchParams.get('session_id')
    if (!bankParam || confirmedRef.current) return
    confirmedRef.current = true

    if (bankParam === 'cancelled') {
      toast('Bank linking was cancelled.')
      router.replace('/dashboard')
      return
    }
    if (bankParam === 'linked' && sessionId) {
      const toastId = toast.loading('Checking your bank account...')
      fetch('/api/stripe/bank/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(async res => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Could not confirm the bank account.')
          if (data.status === 'verified') toast.success(data.message, { id: toastId, duration: 6000 })
          else toast(data.message, { id: toastId, icon: '🏦', duration: 8000 })
          onChange()
        })
        .catch(err => toast.error(err.message, { id: toastId, duration: 8000 }))
        .finally(() => router.replace('/dashboard'))
    }
  }, [searchParams, router, onChange])

  const startLinking = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/bank/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptTerms: agreed }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start bank linking.')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setBusy(false)
    }
  }

  const linked = !!bankLast4 && bankStatus !== 'rejected'

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-primary">Pay for hires by bank (ACH)</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Lower processing cost for large bills. Business bank accounts only, up to ${(ACH_MAX_CENTS / 100).toLocaleString()} per hire.
            Bank payments take about 4 business days to clear; the contractor is hired once it does.
          </p>
        </div>
        {linked && (
          <div className="text-sm text-right shrink-0">
            <p className="font-bold text-primary">{bankName || 'Bank'} ••••{bankLast4}</p>
            {bankStatus === 'verified' && <p className="text-xs font-bold text-green-700">Verified business account</p>}
            {bankStatus === 'needs_review' && <p className="text-xs font-bold text-amber-700">Being reviewed (usually 1 business day)</p>}
          </div>
        )}
      </div>

      {bankStatus === 'rejected' && !bankLast4 && (
        <p className="mt-3 text-sm text-red-600">Your last bank account couldn’t be approved. Link a business account in your company’s name.</p>
      )}

      <div className="mt-4 space-y-3">
        <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1" />
          <span>
            I confirm this is a business bank account in my company’s name, and I authorize FxD Events to debit it for hires I approve.
            I’m responsible for any payment I dispute or reverse for work that was performed, as described in the Terms (Payments, Disputes & Chargebacks).
          </span>
        </label>
        <button
          onClick={startLinking}
          disabled={!agreed || busy}
          className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Opening...' : linked ? 'Replace bank account' : 'Link business bank account'}
        </button>
      </div>
    </div>
  )
}

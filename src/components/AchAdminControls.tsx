'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type Props = {
  userId: string
  companyName: string | null
  achEnabled: boolean
  bankStatus: string | null
  bankName: string | null
  bankLast4: string | null
  holderType: string | null
  ownerNames: string | null
}

// Admin page: bank (ACH) payment controls for one organizer
export default function AchAdminControls(p: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const run = async (action: 'enable' | 'disable' | 'approve_bank' | 'reject_bank', confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/ach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: p.userId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success('Updated')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const btn = 'text-[11px] font-bold px-2.5 py-1 rounded-lg border disabled:opacity-50'

  return (
    <div className="mt-2 text-xs text-slate-500 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-700">Bank payments:</span>
        {p.achEnabled ? (
          <button disabled={busy} onClick={() => run('disable', 'Turn off bank payments for this organizer?')} className={`${btn} border-green-200 bg-green-50 text-green-700`}>On (turn off)</button>
        ) : (
          <button disabled={busy} onClick={() => run('enable', 'Turn on bank payments for this organizer? Only do this for organizers you have vetted.')} className={`${btn} border-slate-200 bg-white text-slate-600`}>Off (turn on)</button>
        )}
        {p.bankLast4 && (
          <span>
            {p.bankName || 'Bank'} ••••{p.bankLast4} · {p.holderType || 'holder type unknown'} ·{' '}
            <span className={p.bankStatus === 'verified' ? 'text-green-700 font-bold' : p.bankStatus === 'needs_review' ? 'text-amber-700 font-bold' : 'text-red-600 font-bold'}>
              {p.bankStatus === 'needs_review' ? 'needs review' : p.bankStatus}
            </span>
          </span>
        )}
        {!p.bankLast4 && p.bankStatus === 'rejected' && <span className="text-red-600 font-bold">bank rejected</span>}
      </div>
      {p.bankLast4 && (
        <p>Company on profile: <b>{p.companyName || '(none)'}</b> · Owners at bank: <b>{p.ownerNames || '(not available yet)'}</b></p>
      )}
      {p.bankStatus === 'needs_review' && p.bankLast4 && (
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => run('approve_bank', 'Approve this as a business account in the company’s name?')} className={`${btn} border-green-200 bg-green-50 text-green-700`}>Approve bank</button>
          <button disabled={busy} onClick={() => run('reject_bank', 'Reject and remove this bank account?')} className={`${btn} border-red-200 bg-red-50 text-red-600`}>Reject bank</button>
        </div>
      )}
    </div>
  )
}

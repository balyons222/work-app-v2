'use client'

import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface LogHoursModalProps {
  applicationId: string
  contractorName: string
  hourlyRate: number
  estimatedHours: number
  onClose: () => void
}

export default function LogHoursModal({ applicationId, contractorName, hourlyRate, estimatedHours, onClose }: LogHoursModalProps) {
  const [actualHours, setActualHours] = useState(estimatedHours.toString())
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const finalTotal = parseFloat(actualHours || '0') * hourlyRate

  const handleSave = async () => {
    if (!actualHours || parseFloat(actualHours) <= 0) {
      return toast.error('Please enter valid hours')
    }

    setIsSaving(true)
    const toastId = toast.loading('Saving hours...')

    const { error } = await supabase
      .from('applications')
      .update({ actual_hours: parseFloat(actualHours) })
      .eq('id', applicationId)

    if (error) {
      toast.error(error.message, { id: toastId })
      setIsSaving(false)
    } else {
      toast.success('Hours finalized!', { id: toastId })
      router.refresh()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-black mb-2">Log Hours</h3>
        <p className="text-sm text-slate-500 mb-6">Finalize shift hours for {contractorName}.</p>
        
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Actual Hours Worked</label>
          <input 
            type="number" 
            step="0.25"
            value={actualHours}
            onChange={(e) => setActualHours(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-center"
          />
        </div>

        <div className="bg-slate-50 p-4 rounded-xl mb-6">
          <div className="flex justify-between text-sm mb-1 text-slate-500">
            <span>Rate</span>
            <span>${hourlyRate}/hr</span>
          </div>
          <div className="flex justify-between text-sm mb-3 text-slate-500">
            <span>Escrow Funded For</span>
            <span>{estimatedHours} hrs</span>
          </div>
          <div className="flex justify-between font-black text-lg border-t border-slate-200 pt-3">
            <span>Final Payout</span>
            <span className={parseFloat(actualHours) > estimatedHours ? 'text-red-500' : 'text-green-600'}>
              ${finalTotal.toFixed(2)}
            </span>
          </div>
          {parseFloat(actualHours) > estimatedHours && (
            <p className="text-xs text-red-500 mt-2 font-bold bg-red-50 p-2 rounded">
              ⚠️ Warning: This exceeds the funded escrow amount.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-3 font-bold text-slate-400">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-black text-white font-bold py-3 rounded-xl">Save</button>
        </div>
      </div>
    </div>
  )
}
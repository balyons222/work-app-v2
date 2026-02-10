'use client'

import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'

export default function TermsModal({ userId, onAccept, onClose }: { userId: string, onAccept: () => void, onClose: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setScrolled(true)
    }
  }

  const handleAccept = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ accepted_tos_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      toast.error("Error saving agreement.")
    } else {
      toast.success("Terms Accepted.")
      onAccept()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-900">Platform Terms & Liability Waiver</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Scrollable Legal Text */}
        <div 
          onScroll={handleScroll}
          className="p-6 overflow-y-auto text-sm text-slate-600 space-y-4 leading-relaxed bg-slate-50"
        >
          <p className="font-bold text-slate-900">Please read carefully before proceeding.</p>
          
          <h3 className="font-bold text-slate-900">1. Independent Contractor Relationship</h3>
          <p>By using FxD Events, you acknowledge that you are an Independent Contractor, not an employee of the Platform or the Organizer. You are responsible for your own taxes, insurance, and tools. You have no expectation of benefits, workers' compensation, or unemployment insurance from FxD Events.</p>

          <h3 className="font-bold text-slate-900">2. Platform as a Venue</h3>
          <p>FxD Events is strictly a communications platform connecting Organizers with Independent Professionals. We do not supervise, direct, or control the work. We are not a party to any contract between Users.</p>

          <h3 className="font-bold text-slate-900">3. Indemnification & Liability</h3>
          <p>You agree to indemnify and hold harmless FxD Events from any claims, damages, or legal actions arising from your use of the platform, including on-site accidents, payment disputes, or property damage.</p>

          <h3 className="font-bold text-slate-900">4. Payment & Taxes</h3>
          <p>Organizers are solely responsible for paying Contractors. Contractors are solely responsible for reporting income to the IRS. FxD Events is not a payroll provider.</p>

          <h3 className="font-bold text-slate-900">5. Professional Conduct</h3>
          <p>You agree to maintain professional standards. Harassment, discrimination, or unsafe behavior will result in immediate termination from the platform.</p>

          <div className="h-10"></div> {/* Spacer */}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl">
          <p className="text-xs text-slate-500 mb-4 text-center">
            {scrolled ? "Thank you for reading." : "Please scroll to the bottom to accept."}
          </p>
          <button 
            onClick={handleAccept}
            disabled={!scrolled || loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
              scrolled 
                ? 'bg-primary text-white hover:bg-slate-800 hover:shadow-xl' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Processing...' : 'I Agree & Accept Terms'}
          </button>
        </div>

      </div>
    </div>
  )
}

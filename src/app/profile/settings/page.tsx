'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/src/utils/supabase/client'
import { AVAILABILITY_OPTIONS, parseAvailability, formatAvailability } from '@/src/config/availability'

export default function PreferencesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [availability, setAvailability] = useState<string[]>([])
  const [listed, setListed] = useState(true) // inverse of profiles.is_private
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('my_profile')
        .select('role, typical_availability, is_private')
        .eq('id', user.id)
        .maybeSingle()

      const role = profile?.role?.toLowerCase()
      if (role !== 'contractor' && role !== 'worker') {
        // Preferences are contractor settings; organizers (or unfinished setups) go back
        router.replace(profile?.role ? '/dashboard' : '/setup-profile')
        return
      }

      setUserId(user.id)
      setAvailability(parseAvailability(profile?.typical_availability))
      setListed(!profile?.is_private)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const toggle = (value: string) =>
    setAvailability(a => (a.includes(value) ? a.filter(v => v !== value) : [...a, value]))

  async function save() {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        typical_availability: formatAvailability(availability),
        is_private: !listed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    setSaving(false)

    if (error) {
      toast.error(error.message || 'Could not save preferences')
      return
    }
    toast.success('Preferences saved')
    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm font-bold text-secondary hover:underline">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-black text-primary mt-4 mb-8">Preferences</h1>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-10">
          {/* Visibility */}
          <section>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-lg font-black text-primary">Show me in Find Talent</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Turn this off when you&apos;re not taking work. Organizers you&apos;ve already worked with can
                  still open your profile from their roster or a direct link.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={listed}
                onClick={() => setListed(l => !l)}
                className={`relative shrink-0 h-8 w-14 rounded-full transition-colors ${listed ? 'bg-secondary' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${listed ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Availability */}
          <section>
            <h2 className="text-lg font-black text-primary">Typical availability</h2>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              Shown on your profile and search card so organizers know when to reach out. Pick all that apply.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABILITY_OPTIONS.map(opt => {
                const on = availability.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(opt.value)}
                    className={`text-left p-4 rounded-xl border transition-all ${on ? 'bg-secondary/10 border-secondary' : 'bg-white border-slate-200 hover:border-secondary'}`}
                  >
                    <p className={`font-bold ${on ? 'text-secondary' : 'text-primary'}`}>{opt.value}</p>
                    <p className="text-xs text-slate-400">{opt.hint}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}

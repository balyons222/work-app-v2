'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ALL_ROLES } from '@/src/constants/roles'

export default function EventManager() {
  const [event, setEvent] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)

  // New Job Form State
  const [roleTitle, setRoleTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pay, setPay] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadEventData()
  }, [])

  async function loadEventData() {
    const eventId = params.eventId as string
    
    // 1. Get Event Details
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
        toast.error('Event not found')
        router.push('/dashboard')
        return
    }
    setEvent(eventData)

    // 2. Get Jobs linked to this event
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, applications(count)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setJobs(jobData || [])
    setLoading(false)
  }

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('jobs').insert({
      title: roleTitle,
      description,
      price: parseFloat(pay),
      start_time: start,
      end_time: end,
      location: event.location, // Auto-inherit location from event
      employer_id: user?.id,
      event_id: event.id, // 👈 Links the job to this event
      status: 'open'
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Role added!')
      setShowAddJob(false)
      // Clear form
      setRoleTitle(''); setDescription(''); setPay(''); setStart(''); setEnd('')
      loadEventData()
    }
  }

  // Calculate Total Spending
  const totalSpent = jobs.reduce((sum, job) => sum + (job.price || 0), 0)
  const budgetLeft = event ? event.budget - totalSpent : 0

  if (loading) return <div className="p-12 text-center">Loading Event...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 hover:text-black mb-4 inline-block">← Back to Events</Link>
        
        {/* EVENT HEADER */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                <p className="text-gray-500 flex gap-4 mt-2">
                    <span>📍 {event.location}</span>
                    <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>
                </p>
            </div>
            
            {/* BUDGET TRACKER */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 min-w-[200px]">
                <p className="text-sm text-gray-500 font-medium uppercase">Budget Status</p>
                <div className="flex justify-between items-end mt-1">
                    <span className="text-2xl font-bold text-gray-900">${budgetLeft.toFixed(0)}</span>
                    <span className="text-xs text-gray-400 mb-1">left of ${event.budget}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                        className={`h-1.5 rounded-full ${budgetLeft < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                        style={{ width: `${Math.min((totalSpent / event.budget) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
        </div>

        {/* JOBS SECTION */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Roles & Staffing</h2>
            <button 
                onClick={() => setShowAddJob(!showAddJob)}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
                {showAddJob ? 'Cancel' : '+ Add Role'}
            </button>
        </div>

        {/* ADD JOB FORM */}
        {showAddJob && (
            <div className="bg-white p-6 rounded-xl shadow border border-blue-100 mb-6 animate-fade-in-down">
                <form onSubmit={handleAddJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase text-gray-500">Role Title</label>
                        {/* REPLACEMENT: Dropdown for Standardized Roles */}
<select 
  className="w-full p-2 border rounded bg-white" 
  value={roleTitle} 
  onChange={e => setRoleTitle(e.target.value)} 
  required
>
  <option value="">-- Select a Role --</option>
  {ALL_ROLES.sort().map(role => (
    <option key={role} value={role}>{role}</option>
  ))}
</select>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500">Pay ($)</label>
                        <input type="number" className="w-full p-2 border rounded" placeholder="150" value={pay} onChange={e => setPay(e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500">Job Description</label>
                        <input className="w-full p-2 border rounded" placeholder="Brief details..." value={description} onChange={e => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500">Start Time</label>
                        <input type="datetime-local" className="w-full p-2 border rounded" value={start} onChange={e => setStart(e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500">End Time</label>
                        <input type="datetime-local" className="w-full p-2 border rounded" value={end} onChange={e => setEnd(e.target.value)} required />
                    </div>
                    <button type="submit" className="md:col-span-2 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Save Role</button>
                </form>
            </div>
        )}

        {/* JOB LIST */}
        <div className="space-y-4">
            {jobs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No roles added yet.</p>
            ) : (
                jobs.map(job => (
                    <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-blue-300 transition-colors">
                        <div>
                            <h3 className="font-bold text-lg">{job.title}</h3>
                            <p className="text-gray-500 text-sm">{job.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(job.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                {new Date(job.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-lg">${job.price}</span>
                            <Link href={`/dashboard/${job.id}`} className="text-sm text-blue-600 hover:underline">
                                View Applicants ({job.applications?.[0]?.count || 0}) &rarr;
                            </Link>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>
    </div>
  )
}
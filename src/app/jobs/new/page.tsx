import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import JobPostForm from './JobPostForm'

export default async function NewJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile is complete and if they are an organizer
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/setup-profile')
  }

  // Optional: Only let "Organizers" post jobs
  if (profile.role !== 'organizer') {
    // We can redirect them to search if they are a contractor trying to post
    redirect('/search')
  }

  return <JobPostForm />
}
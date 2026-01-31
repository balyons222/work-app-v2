import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import JobPostForm from './JobPostForm'

export default async function NewJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/setup-profile')
  }

  return <JobPostForm />
}
import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import SearchClient from './SearchClient'

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile is complete
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/setup-profile')
  }

  // If passed the guard, render the client component
  return <SearchClient />
}
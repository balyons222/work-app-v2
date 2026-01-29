'use server'

import { createClient } from '../../utils/supabase/server'

export async function searchContractors(formData: FormData) {
  const supabase = await createClient()
  const location = formData.get('location') as string
  const skill = formData.get('skill') as string

  // Start the query: Get all profiles
  let query = supabase
    .from('profiles')
    .select('*')
    //.eq('role', 'worker') // Uncomment this if you have a 'role' column to filter only workers!
  
  // If user typed a location, filter by city or state
  if (location) {
    query = query.or(`city.ilike.%${location}%,state.ilike.%${location}%`)
  }

  // If user typed a skill, filter by skills column
  if (skill) {
    query = query.ilike('skills', `%${skill}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Search error:', error)
    return []
  }

  return data
}
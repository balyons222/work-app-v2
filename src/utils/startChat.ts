import { SupabaseClient } from '@supabase/supabase-js'

export async function startChat(
  supabase: SupabaseClient, 
  router: any, 
  details: { jobId: string, workerId: string, organizerId: string }
) {
  const { jobId, workerId, organizerId } = details

  // 1. Check if chat exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('job_id', jobId)
    .eq('worker_id', workerId)
    .single()

  if (existing) {
    // Chat exists, go there
    router.push(`/messages?id=${existing.id}`)
    return
  }

  // 2. If not, create it
  const { data: newChat, error } = await supabase
    .from('conversations')
    .insert({
      job_id: jobId,
      worker_id: workerId,
      organizer_id: organizerId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating chat', error)
    alert('Could not start chat')
  } else {
    router.push(`/messages?id=${newChat.id}`)
  }
}
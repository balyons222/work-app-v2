import { NextResponse } from 'next/server'
import { createClient } from '@/src/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Attempt to exchange the code for a secure session cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // If the error is 'flow_state_already_used', the first invisible pass 
      // already logged them in successfully. We can ignore it.
      if (error.message.includes('already been used') || error.message.includes('flow_state')) {
        console.log('Duplicate callback caught and ignored.')
      } else {
        // If it's a real error, send them back to login
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }
    }
  }

  // Once the session is confirmed, route them to the dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
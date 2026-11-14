import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/src/types/database'

/**
 * Service-role client: bypasses RLS and column grants. Server-only (API routes / server
 * components), and only after the caller's identity and permissions have been checked.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

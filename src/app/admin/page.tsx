import { createClient as createServerClient } from '@/src/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DeleteUserButton from '@/src/components/DeleteUserButton'

export default async function AdminDashboard() {
  const supabase = await createServerClient()
  
  // 1. Security Check: Ensure only YOU can view this page
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = ['brian@fxdevents.com'] // Replace with your actual admin email
  
  if (!user || !adminEmails.includes(user.email || '')) {
    redirect('/dashboard') // Kick unauthorized users back to the main dashboard
  }

  // 2. Fetch all profiles. Service role is required: private columns aren't readable by normal users
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // 3. Render the UI
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Platform Admin</h1>
        <p className="text-gray-500 mb-8">Manage FxD Events users and profiles.</p>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {users?.map(targetUser => (
            <div key={targetUser.id} className="flex justify-between items-center p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-bold text-gray-900">{targetUser.full_name || 'Incomplete Profile'}</p>
                <div className="flex gap-3 items-center mt-1">
                  <p className="text-sm text-gray-500">{targetUser.email}</p>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                    {targetUser.role || 'No Role'}
                  </span>
                </div>
              </div>
              
              {/* Your button component securely passed the user ID */}
              <DeleteUserButton targetUserId={targetUser.id} />
            </div>
          ))}

          {(!users || users.length === 0) && (
            <div className="p-12 text-center text-gray-400">No users found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
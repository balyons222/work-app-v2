import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { isAdminEmail } from '@/src/config/admins'
import type { Database } from '@/src/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
})

type Action = 'enable' | 'disable' | 'approve_bank' | 'reject_bank'

// Admin-only: switch bank (ACH) payments on/off for an organizer, and approve or reject a linked
// bank account that needs review (holder type unknown, or owner names don't match the company).
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { targetUserId, action } = (await req.json()) as { targetUserId?: string; action?: Action }
    if (!targetUserId || !action) return NextResponse.json({ error: 'Missing user or action.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: target } = await admin
      .from('profiles')
      .select('role, ach_bank_payment_method_id, ach_bank_holder_type')
      .eq('id', targetUserId)
      .single()
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    if (target.role !== 'organizer') return NextResponse.json({ error: 'Bank payments are for organizers only.' }, { status: 400 })

    let update: Database['public']['Tables']['profiles']['Update']
    switch (action) {
      case 'enable':
        update = { ach_enabled: true }
        break
      case 'disable':
        update = { ach_enabled: false }
        break
      case 'approve_bank':
        if (!target.ach_bank_payment_method_id) return NextResponse.json({ error: 'No bank account linked.' }, { status: 400 })
        if (target.ach_bank_holder_type === 'individual') return NextResponse.json({ error: 'Personal accounts can’t be approved.' }, { status: 400 })
        update = { ach_bank_status: 'verified' }
        break
      case 'reject_bank':
        if (target.ach_bank_payment_method_id) {
          await stripe.paymentMethods.detach(target.ach_bank_payment_method_id).catch(() => {})
        }
        update = { ach_bank_status: 'rejected', ach_bank_payment_method_id: null, ach_bank_mandate_id: null }
        break
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    }

    const { error } = await admin.from('profiles').update(update).eq('id', targetUserId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin ACH error:', error.message)
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  }
}

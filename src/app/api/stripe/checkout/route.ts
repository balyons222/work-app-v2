import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/src/utils/supabase/server'

// Initialize Stripe with your secret key (you will add this to your .env file)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20', 
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { priceId } = body

    // Generate the secure Stripe Checkout URL
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      
      // THIS IS THE MAGIC LINE: Tells Stripe to show the Coupon Code field
      allow_promotion_codes: true, 
      
      // Where to send the user after they pay (or cancel)
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      
      // Attach the user's Supabase ID to the Stripe session so our webhook knows who paid
      client_reference_id: user.id,
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
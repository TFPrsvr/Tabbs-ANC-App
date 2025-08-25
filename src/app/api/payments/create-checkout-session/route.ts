import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { stripeConfig } from '@/config/payments/stripe';
import { DatabaseService } from '@/lib/database/neon';

const stripe = new Stripe(stripeConfig.secretKey);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Get or create user in database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${stripeConfig.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeConfig.cancelUrl,
      metadata: {
        userId: user.id,
        clerkUserId: userId,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          clerkUserId: userId,
        },
      },
    });

    // Track checkout initiation
    await DatabaseService.trackUsage(user.id, 'checkout_initiated', {
      priceId,
      sessionId: session.id,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
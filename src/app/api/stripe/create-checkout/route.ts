import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCheckoutSession, createCustomer, getCustomer } from '@/lib/stripe/stripe-server';
import { DatabaseService } from '@/lib/database/neon';
import { getCurrencyForCountry } from '@/lib/stripe/stripe-config';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      priceId,
      tier,
      billingPeriod,
      couponId,
      countryCode,
    } = await req.json();

    if (!priceId || !tier) {
      return NextResponse.json(
        { error: 'Price ID and tier are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = (user as any).stripeCustomerId;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await createCustomer({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id.toString(),
          clerkId: userId,
          tier: tier,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      // TODO: Implement updateUser method in DatabaseService
      console.log(`Customer ${customerId} created for user ${user.id}`);
    } else {
      // Verify customer exists in Stripe
      const existingCustomer = await getCustomer(customerId);
      if (!existingCustomer) {
        // Recreate customer if not found
        const customer = await createCustomer({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user.id.toString(),
            clerkId: userId,
            tier: tier,
          },
        });

        customerId = customer.id;

        // TODO: Implement updateUser method in DatabaseService
        console.log(`Customer ${customerId} recreated for user ${user.id}`);
      }
    }

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      customerId,
      successUrl: `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
      couponId,
      trialPeriodDays: tier !== 'free' ? 14 : undefined,
      metadata: {
        userId: user.id.toString(),
        tier,
        billingPeriod: billingPeriod || 'monthly',
      },
      currency: countryCode ? getCurrencyForCountry(countryCode) : 'usd',
    });

    // Log the checkout attempt
    await DatabaseService.trackUsage(user.id, 'checkout_started', {
      tier,
      priceId,
      sessionId: session.id,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
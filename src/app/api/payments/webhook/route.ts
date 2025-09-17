import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripeConfig } from '@/config/payments/stripe';
import { DatabaseService } from '@/lib/database/neon';
import { neon } from '@neondatabase/serverless';

const stripe = new Stripe(stripeConfig.secretKey);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeConfig.webhookSecret
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling webhook ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const clerkUserId = session.metadata?.clerkUserId;
  
  if (!userId || !clerkUserId) {
    console.error('Missing user metadata in checkout session');
    return;
  }

  // Track successful checkout
  await DatabaseService.trackUsage(userId, 'checkout_completed', {
    sessionId: session.id,
    subscriptionId: session.subscription,
    amountTotal: session.amount_total,
  });

  console.log(`Checkout completed for user ${clerkUserId}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const clerkUserId = subscription.metadata?.clerkUserId;
  
  if (!userId || !clerkUserId) {
    console.error('Missing user metadata in subscription');
    return;
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Get plan information
  const priceId = subscription.items.data[0]?.price.id;
  const planResult = await sql`
    SELECT * FROM payment_plans 
    WHERE stripe_price_id = ${priceId}
    LIMIT 1
  `;

  if (planResult.length > 0) {
    const plan = planResult[0];

    // Create subscription record
    await sql`
      INSERT INTO subscriptions (
        user_id, plan_id, stripe_subscription_id, status,
        current_period_start, current_period_end, cancel_at_period_end
      )
      VALUES (
        ${userId}, ${plan?.id}, ${subscription.id}, ${subscription.status},
        ${new Date((subscription as any).current_period_start * 1000).toISOString()},
        ${new Date((subscription as any).current_period_end * 1000).toISOString()},
        ${subscription.cancel_at_period_end}
      )
    `;

    // Track subscription creation
    await DatabaseService.trackUsage(userId, 'subscription_created', {
      planName: plan?.name,
      subscriptionId: subscription.id,
      priceId: priceId,
    });
  }

  console.log(`Subscription created for user ${clerkUserId}: ${subscription.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('Missing user metadata in subscription');
    return;
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Update subscription record
  await sql`
    UPDATE subscriptions 
    SET status = ${subscription.status},
        current_period_start = ${new Date((subscription as any).current_period_start * 1000).toISOString()},
        current_period_end = ${new Date((subscription as any).current_period_end * 1000).toISOString()},
        cancel_at_period_end = ${subscription.cancel_at_period_end}
    WHERE stripe_subscription_id = ${subscription.id}
  `;

  // Track subscription update
  await DatabaseService.trackUsage(userId, 'subscription_updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  console.log(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('Missing user metadata in subscription');
    return;
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Update subscription status
  await sql`
    UPDATE subscriptions 
    SET status = 'cancelled'
    WHERE stripe_subscription_id = ${subscription.id}
  `;

  // Track subscription cancellation
  await DatabaseService.trackUsage(userId, 'subscription_cancelled', {
    subscriptionId: subscription.id,
    cancelledAt: new Date().toISOString(),
  });

  console.log(`Subscription cancelled: ${subscription.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) return;

  // Get subscription to find user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;

  // Track successful payment
  await DatabaseService.trackUsage(userId, 'payment_succeeded', {
    invoiceId: invoice.id,
    subscriptionId: subscriptionId,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
  });

  console.log(`Payment succeeded for subscription: ${subscriptionId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) return;

  // Get subscription to find user
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;

  // Track failed payment
  await DatabaseService.trackUsage(userId, 'payment_failed', {
    invoiceId: invoice.id,
    subscriptionId: subscriptionId,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
  });

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}
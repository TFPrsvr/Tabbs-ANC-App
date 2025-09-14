import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe/stripe-server';
import { DatabaseService } from '@/lib/database/neon';
import Stripe from 'stripe';

// Disable Next.js body parsing for webhooks
export const runtime = 'nodejs';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!customerId || !subscriptionId) {
      console.error('Missing customer or subscription ID in checkout session');
      return;
    }

    // Get user from database using customer ID
    const user = await DatabaseService.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('User not found for Stripe customer:', customerId);
      return;
    }

    // Update user subscription
    await DatabaseService.createOrUpdateSubscription({
      userId: user.id,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      status: 'active',
      tier: session.metadata?.tier || 'pro',
      billingPeriod: session.metadata?.billingPeriod || 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Track the successful subscription
    await DatabaseService.trackUsage(user.id, 'subscription_created', {
      tier: session.metadata?.tier || 'pro',
      subscriptionId,
      sessionId: session.id,
    });

    console.log('Successfully handled checkout session completed for user:', user.id);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    const user = await DatabaseService.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('User not found for Stripe customer:', customerId);
      return;
    }

    // Get the subscription from database
    const dbSubscription = await DatabaseService.getUserSubscription(user.id);
    if (!dbSubscription) {
      console.error('Subscription not found for user:', user.id);
      return;
    }

    // Update subscription details
    await DatabaseService.updateSubscription(dbSubscription.id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    // Track the subscription update
    await DatabaseService.trackUsage(user.id, 'subscription_updated', {
      status: subscription.status,
      subscriptionId: subscription.id,
    });

    console.log('Successfully handled subscription updated for user:', user.id);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    const user = await DatabaseService.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('User not found for Stripe customer:', customerId);
      return;
    }

    // Update subscription status
    const dbSubscription = await DatabaseService.getUserSubscription(user.id);
    if (dbSubscription) {
      await DatabaseService.updateSubscription(dbSubscription.id, {
        status: 'canceled',
        canceledAt: new Date(subscription.canceled_at || Date.now() / 1000 * 1000),
      });
    }

    // Track the cancellation
    await DatabaseService.trackUsage(user.id, 'subscription_canceled', {
      subscriptionId: subscription.id,
      cancelReason: subscription.metadata?.cancel_reason || 'user_canceled',
    });

    console.log('Successfully handled subscription deleted for user:', user.id);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;

    const user = await DatabaseService.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('User not found for Stripe customer:', customerId);
      return;
    }

    // Track the successful payment
    await DatabaseService.trackUsage(user.id, 'invoice_paid', {
      invoiceId: invoice.id,
      subscriptionId,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    });

    // Update subscription if it was previously past due
    if (subscriptionId) {
      const dbSubscription = await DatabaseService.getUserSubscription(user.id);
      if (dbSubscription && dbSubscription.status === 'past_due') {
        await DatabaseService.updateSubscription(dbSubscription.id, {
          status: 'active',
        });
      }
    }

    console.log('Successfully handled invoice paid for user:', user.id);
  } catch (error) {
    console.error('Error handling invoice paid:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;

    const user = await DatabaseService.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('User not found for Stripe customer:', customerId);
      return;
    }

    // Update subscription status to past_due
    if (subscriptionId) {
      const dbSubscription = await DatabaseService.getUserSubscription(user.id);
      if (dbSubscription) {
        await DatabaseService.updateSubscription(dbSubscription.id, {
          status: 'past_due',
        });
      }
    }

    // Track the failed payment
    await DatabaseService.trackUsage(user.id, 'invoice_payment_failed', {
      invoiceId: invoice.id,
      subscriptionId,
      amount: invoice.amount_due,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count,
    });

    console.log('Successfully handled invoice payment failed for user:', user.id);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

async function handleCustomerSubscriptionTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    const user = await DatabaseService.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error('User not found for Stripe customer:', customerId);
      return;
    }

    // Track trial ending
    await DatabaseService.trackUsage(user.id, 'trial_will_end', {
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    });

    console.log('Successfully handled trial will end for user:', user.id);
  } catch (error) {
    console.error('Error handling trial will end:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Received webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleCustomerSubscriptionTrialWillEnd(event.data.object);
        break;

      case 'payment_method.attached':
        console.log('Payment method attached:', event.data.object.id);
        break;

      case 'customer.updated':
        console.log('Customer updated:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
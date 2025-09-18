import Stripe from 'stripe';
import { stripeConfig, getCurrencyForCountry } from './stripe-config';

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Types
export interface CreateCheckoutSessionParams {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  couponId?: string;
  metadata?: Record<string, string>;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  currency?: string;
  locale?: Stripe.Checkout.SessionCreateParams.Locale;
  paymentMethodTypes?: string[];
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  phone?: string;
  address?: Stripe.AddressParam;
  metadata?: Record<string, string>;
  tax_id?: {
    type: string;
    value: string;
  };
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  metadata?: Record<string, string>;
}

// Customer management
export const createCustomer = async (params: CreateCustomerParams): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      phone: params.phone,
      address: params.address,
      metadata: {
        source: 'anc-audio-app',
        ...params.metadata,
      },
      tax: params.tax_id ? {
        validate_location: 'deferred',
      } : undefined,
    });

    // Add tax ID if provided
    if (params.tax_id && customer.id) {
      await stripe.customers.createTaxId(customer.id, {
        type: params.tax_id.type as any,
        value: params.tax_id.value,
      });
    }

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const updateCustomer = async (
  customerId: string,
  updates: Partial<CreateCustomerParams>
): Promise<Stripe.Customer> => {
  try {
    return await stripe.customers.update(customerId, {
      email: updates.email,
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
      metadata: updates.metadata,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const getCustomer = async (customerId: string): Promise<Stripe.Customer | null> => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer.deleted ? null : customer as Stripe.Customer;
  } catch (error) {
    console.error('Error retrieving customer:', error);
    return null;
  }
};

// Checkout session management
export const createCheckoutSession = async (
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> => {
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer: params.customerId,
      customer_email: params.customerId ? undefined : params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      billing_address_collection: params.billingAddressCollection || 'required',
      phone_number_collection: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      customer_creation: params.customerId ? undefined : 'always',
      allow_promotion_codes: params.allowPromotionCodes ?? true,
      discounts: params.couponId ? [{ coupon: params.couponId }] : undefined,
      subscription_data: {
        trial_period_days: params.trialPeriodDays,
        metadata: {
          source: 'anc-audio-app',
          ...params.metadata,
        },
      },
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_fields: [
        {
          key: 'company',
          label: {
            type: 'custom',
            custom: 'Company Name (Optional)',
          },
          type: 'text',
          optional: true,
        },
        {
          key: 'use_case',
          label: {
            type: 'custom',
            custom: 'Primary Use Case',
          },
          type: 'dropdown',
          dropdown: {
            options: [
              { label: 'Podcast Production', value: 'podcast' },
              { label: 'Music Production', value: 'music' },
              { label: 'Voice-over Work', value: 'voiceover' },
              { label: 'Educational Content', value: 'education' },
              { label: 'Business/Corporate', value: 'business' },
              { label: 'Personal Projects', value: 'personal' },
              { label: 'Other', value: 'other' },
            ],
          },
        },
      ],
      automatic_tax: {
        enabled: true,
      },
      locale: params.locale || 'auto',
      payment_method_types: (params.paymentMethodTypes as any) || ['card'],
      metadata: {
        source: 'anc-audio-app',
        ...params.metadata,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Subscription management
export const createSubscription = async (
  customerId: string,
  priceId: string,
  options: {
    trialPeriodDays?: number;
    paymentMethodId?: string;
    couponId?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<Stripe.Subscription> => {
  try {
    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        source: 'anc-audio-app',
        ...options.metadata,
      },
    };

    if (options.trialPeriodDays) {
      subscriptionData.trial_period_days = options.trialPeriodDays;
    }

    if (options.paymentMethodId) {
      subscriptionData.default_payment_method = options.paymentMethodId;
    }

    if (options.couponId) {
      (subscriptionData as any).coupon = options.couponId;
    }

    return await stripe.subscriptions.create(subscriptionData);
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

export const updateSubscription = async (
  params: UpdateSubscriptionParams
): Promise<Stripe.Subscription> => {
  try {
    const updateData: Stripe.SubscriptionUpdateParams = {
      proration_behavior: params.prorationBehavior || 'create_prorations',
      metadata: params.metadata,
    };

    if (params.priceId) {
      // Get current subscription to find the subscription item
      const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
      const subscriptionItem = subscription.items.data[0];

      if (!subscriptionItem) {
        throw new Error('No subscription items found');
      }

      updateData.items = [
        {
          id: subscriptionItem.id,
          price: params.priceId,
          quantity: params.quantity || 1,
        },
      ];
    }

    return await stripe.subscriptions.update(params.subscriptionId, updateData);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export const cancelSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> => {
  try {
    if (cancelAtPeriodEnd) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancelled_at: new Date().toISOString(),
        },
      });
    } else {
      return await stripe.subscriptions.cancel(subscriptionId);
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

export const reactivateSubscription = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  try {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      metadata: {
        reactivated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
};

// Payment method management
export const attachPaymentMethod = async (
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> => {
  try {
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    throw error;
  }
};

export const setDefaultPaymentMethod = async (
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> => {
  try {
    return await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    throw error;
  }
};

export const listPaymentMethods = async (
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = 'card'
): Promise<Stripe.PaymentMethod[]> => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
    return paymentMethods.data;
  } catch (error) {
    console.error('Error listing payment methods:', error);
    return [];
  }
};

// Invoice management
export const getUpcomingInvoice = async (
  customerId: string
): Promise<Stripe.Invoice | null> => {
  try {
    return await (stripe.invoices as any).upcoming({
      customer: customerId,
    });
  } catch (error) {
    console.error('Error retrieving upcoming invoice:', error);
    return null;
  }
};

export const listInvoices = async (
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('Error listing invoices:', error);
    return [];
  }
};

// Usage records for metered billing
export const createUsageRecord = async (
  subscriptionItemId: string,
  quantity: number,
  timestamp?: number
): Promise<any> => {
  try {
    return await (stripe.subscriptionItems as any).createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });
  } catch (error) {
    console.error('Error creating usage record:', error);
    throw error;
  }
};

// Coupon management
export const createCoupon = async (
  couponData: Stripe.CouponCreateParams
): Promise<Stripe.Coupon> => {
  try {
    return await stripe.coupons.create(couponData);
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
};

export const validateCoupon = async (couponId: string): Promise<Stripe.Coupon | null> => {
  try {
    const coupon = await stripe.coupons.retrieve(couponId);
    return coupon.valid ? coupon : null;
  } catch (error) {
    console.error('Error validating coupon:', error);
    return null;
  }
};

// Webhook utilities
export const constructWebhookEvent = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Error constructing webhook event:', error);
    throw error;
  }
};

// Analytics and reporting
export const getSubscriptionAnalytics = async (
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  mrr: number;
}> => {
  try {
    // Get invoices for the period
    const invoices = await stripe.invoices.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      status: 'paid',
      limit: 100,
    });

    const totalRevenue = invoices.data.reduce((sum, invoice) => sum + invoice.amount_paid, 0);

    // Get subscriptions created in the period
    const newSubscriptions = await stripe.subscriptions.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      status: 'active',
      limit: 100,
    });

    // Get canceled subscriptions in the period
    const canceledSubscriptions = await stripe.subscriptions.list({
      canceled_at: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    } as any);

    // Calculate MRR (simplified)
    const activeSubscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    const mrr = activeSubscriptions.data.reduce((sum, sub) => {
      const monthlyAmount = sub.items.data.reduce((itemSum, item) => {
        const price = item.price;
        if (price.recurring?.interval === 'month') {
          return itemSum + (price.unit_amount || 0);
        } else if (price.recurring?.interval === 'year') {
          return itemSum + (price.unit_amount || 0) / 12;
        }
        return itemSum;
      }, 0);
      return sum + monthlyAmount;
    }, 0);

    return {
      totalRevenue,
      newSubscriptions: newSubscriptions.data.length,
      canceledSubscriptions: canceledSubscriptions.data.length,
      mrr,
    };
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    throw error;
  }
};

// Tax calculation
export const calculateTax = async (
  customerId: string,
  lineItems: Array<{
    amount: number;
    reference: string;
  }>
): Promise<Stripe.Tax.Calculation> => {
  try {
    return await stripe.tax.calculations.create({
      currency: 'usd',
      customer: customerId,
      line_items: lineItems,
      customer_details: {
        address_source: 'billing',
      } as any,
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    throw error;
  }
};

export default stripe;
import { EventEmitter } from 'events';

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: {
    projectsPerMonth: number;
    storageGB: number;
    exportQuality: string[];
    collaborators: number;
    aiProcessingMinutes: number;
    supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  };
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  trialDays?: number;
  popular?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tierId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: PaymentMethod;
  usage: UsageMetrics;
  invoices: Invoice[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  paypal?: {
    email: string;
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface UsageMetrics {
  period: { start: Date; end: Date };
  projectsCreated: number;
  storageUsedGB: number;
  aiProcessingMinutes: number;
  exportsGenerated: number;
  collaboratorsActive: number;
  apiCalls: number;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  created: Date;
  dueDate: Date;
  paidAt?: Date;
  items: InvoiceItem[];
  discount?: {
    coupon: string;
    amount: number;
  };
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
  period: { start: Date; end: Date };
}

export interface PromoCode {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'trial_extension';
  value: number;
  validUntil: Date;
  maxRedemptions: number;
  currentRedemptions: number;
  applicableTiers: string[];
  firstTimeOnly: boolean;
}

export class SubscriptionManager extends EventEmitter {
  private subscriptionTiers: Map<string, SubscriptionTier> = new Map();
  private userSubscriptions: Map<string, UserSubscription> = new Map();
  private promoCodes: Map<string, PromoCode> = new Map();

  constructor() {
    super();
    this.initializeDefaultTiers();
    this.initializePromoCodes();
  }

  private initializeDefaultTiers(): void {
    const tiers: SubscriptionTier[] = [
      {
        id: 'free',
        name: 'Free',
        description: 'Perfect for getting started with basic audio editing',
        features: [
          'Basic audio editing tools',
          'Up to 3 projects per month',
          '500MB cloud storage',
          'Community support',
          'Standard quality exports'
        ],
        limits: {
          projectsPerMonth: 3,
          storageGB: 0.5,
          exportQuality: ['mp3-128', 'wav-16'],
          collaborators: 0,
          aiProcessingMinutes: 10,
          supportLevel: 'community'
        },
        pricing: {
          monthly: 0,
          yearly: 0,
          currency: 'USD'
        },
        trialDays: 0
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'Advanced features for content creators and podcasters',
        features: [
          'All Free features',
          'Unlimited projects',
          '50GB cloud storage',
          'AI-powered audio enhancement',
          'HD quality exports',
          'Basic collaboration tools',
          'Email support',
          'Advanced noise reduction',
          'Voice isolation & separation'
        ],
        limits: {
          projectsPerMonth: -1, // unlimited
          storageGB: 50,
          exportQuality: ['mp3-320', 'wav-24', 'flac'],
          collaborators: 5,
          aiProcessingMinutes: 300,
          supportLevel: 'email'
        },
        pricing: {
          monthly: 19.99,
          yearly: 199.99,
          currency: 'USD'
        },
        trialDays: 14,
        popular: true
      },
      {
        id: 'studio',
        name: 'Studio',
        description: 'Professional-grade tools for audio professionals',
        features: [
          'All Pro features',
          'Unlimited cloud storage',
          'Real-time collaboration',
          'Advanced AI features',
          'Uncompressed exports',
          'Priority support',
          'Custom presets & templates',
          'Batch processing',
          'Advanced analytics',
          'API access'
        ],
        limits: {
          projectsPerMonth: -1,
          storageGB: -1, // unlimited
          exportQuality: ['wav-32', 'aiff-24', 'dsd'],
          collaborators: 25,
          aiProcessingMinutes: 1000,
          supportLevel: 'priority'
        },
        pricing: {
          monthly: 49.99,
          yearly: 499.99,
          currency: 'USD'
        },
        trialDays: 30
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Scalable solution for teams and organizations',
        features: [
          'All Studio features',
          'Unlimited everything',
          'Advanced team management',
          'Custom integrations',
          'Dedicated account manager',
          'On-premise deployment option',
          'Custom SLA',
          'Advanced security features',
          'Usage analytics & reporting',
          'Custom training & onboarding'
        ],
        limits: {
          projectsPerMonth: -1,
          storageGB: -1,
          exportQuality: ['all'],
          collaborators: -1,
          aiProcessingMinutes: -1,
          supportLevel: 'dedicated'
        },
        pricing: {
          monthly: 199.99,
          yearly: 1999.99,
          currency: 'USD'
        },
        trialDays: 30
      }
    ];

    tiers.forEach(tier => {
      this.subscriptionTiers.set(tier.id, tier);
    });
  }

  private initializePromoCodes(): void {
    const promoCodes: PromoCode[] = [
      {
        code: 'WELCOME2024',
        type: 'percentage',
        value: 20,
        validUntil: new Date('2024-12-31'),
        maxRedemptions: 1000,
        currentRedemptions: 0,
        applicableTiers: ['pro', 'studio'],
        firstTimeOnly: true
      },
      {
        code: 'CREATOR50',
        type: 'percentage',
        value: 50,
        validUntil: new Date('2024-06-30'),
        maxRedemptions: 500,
        currentRedemptions: 0,
        applicableTiers: ['pro'],
        firstTimeOnly: true
      },
      {
        code: 'STUDENT',
        type: 'percentage',
        value: 40,
        validUntil: new Date('2025-12-31'),
        maxRedemptions: -1, // unlimited
        currentRedemptions: 0,
        applicableTiers: ['pro', 'studio'],
        firstTimeOnly: false
      }
    ];

    promoCodes.forEach(code => {
      this.promoCodes.set(code.code, code);
    });
  }

  async createSubscription(
    userId: string,
    tierId: string,
    paymentMethodId?: string,
    promoCode?: string
  ): Promise<UserSubscription> {
    try {
      const tier = this.subscriptionTiers.get(tierId);
      if (!tier) {
        throw new Error(`Invalid subscription tier: ${tierId}`);
      }

      if (tierId === 'free') {
        return this.createFreeSubscription(userId, tier);
      }

      if (!paymentMethodId && tierId !== 'free') {
        throw new Error('Payment method required for paid subscriptions');
      }

      let discount = null;
      if (promoCode) {
        discount = await this.validatePromoCode(promoCode, tierId, userId);
      }

      const subscription: UserSubscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        tierId,
        status: tier.trialDays > 0 ? 'trialing' : 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        trialEnd: tier.trialDays > 0 ? new Date(Date.now() + tier.trialDays * 24 * 60 * 60 * 1000) : undefined,
        cancelAtPeriodEnd: false,
        usage: this.initializeUsageMetrics(),
        invoices: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Process initial payment if not in trial
      if (!subscription.trialEnd) {
        const invoice = await this.createInvoice(subscription, discount);
        subscription.invoices.push(invoice);

        // In real implementation, process payment here
        await this.processPayment(paymentMethodId!, invoice.amount);
      }

      this.userSubscriptions.set(userId, subscription);
      this.emit('subscriptionCreated', subscription);

      return subscription;
    } catch (error) {
      this.emit('error', { type: 'subscription_creation', error: error.message, userId });
      throw error;
    }
  }

  async upgradeSubscription(userId: string, newTierId: string): Promise<UserSubscription> {
    const currentSubscription = this.userSubscriptions.get(userId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newTier = this.subscriptionTiers.get(newTierId);
    const currentTier = this.subscriptionTiers.get(currentSubscription.tierId);

    if (!newTier || !currentTier) {
      throw new Error('Invalid subscription tier');
    }

    if (newTier.pricing.monthly <= currentTier.pricing.monthly) {
      throw new Error('Can only upgrade to higher tier');
    }

    // Calculate prorated amount
    const remainingDays = Math.ceil(
      (currentSubscription.currentPeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    const proratedAmount = this.calculateProration(currentTier, newTier, remainingDays);

    // Create upgrade invoice
    const upgradeInvoice: Invoice = {
      id: `inv_upgrade_${Date.now()}`,
      subscriptionId: currentSubscription.id,
      amount: proratedAmount,
      currency: newTier.pricing.currency,
      status: 'paid',
      created: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      items: [
        {
          description: `Upgrade to ${newTier.name}`,
          amount: proratedAmount,
          quantity: 1,
          period: {
            start: new Date(),
            end: currentSubscription.currentPeriodEnd
          }
        }
      ]
    };

    currentSubscription.tierId = newTierId;
    currentSubscription.invoices.push(upgradeInvoice);
    currentSubscription.updatedAt = new Date();

    this.userSubscriptions.set(userId, currentSubscription);
    this.emit('subscriptionUpgraded', { subscription: currentSubscription, fromTier: currentTier.id, toTier: newTierId });

    return currentSubscription;
  }

  async cancelSubscription(userId: string, immediate: boolean = false): Promise<UserSubscription> {
    const subscription = this.userSubscriptions.get(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (immediate) {
      subscription.status = 'canceled';
      subscription.currentPeriodEnd = new Date();
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    subscription.updatedAt = new Date();
    this.userSubscriptions.set(userId, subscription);

    this.emit('subscriptionCanceled', { subscription, immediate });
    return subscription;
  }

  async validatePromoCode(code: string, tierId: string, userId: string): Promise<any> {
    const promo = this.promoCodes.get(code.toUpperCase());

    if (!promo) {
      throw new Error('Invalid promo code');
    }

    if (promo.validUntil < new Date()) {
      throw new Error('Promo code has expired');
    }

    if (promo.maxRedemptions > 0 && promo.currentRedemptions >= promo.maxRedemptions) {
      throw new Error('Promo code has reached maximum redemptions');
    }

    if (!promo.applicableTiers.includes(tierId)) {
      throw new Error('Promo code not applicable to selected tier');
    }

    if (promo.firstTimeOnly) {
      // Check if user has used promo codes before
      const hasUsedPromo = this.hasUserUsedPromoCode(userId);
      if (hasUsedPromo) {
        throw new Error('Promo code is for first-time users only');
      }
    }

    return {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      description: `${promo.value}${promo.type === 'percentage' ? '%' : '$'} off`
    };
  }

  async getUsageAnalytics(userId: string): Promise<UsageMetrics & { tierLimits: any; utilizationPercentage: any }> {
    const subscription = this.userSubscriptions.get(userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    const tier = this.subscriptionTiers.get(subscription.tierId);
    if (!tier) {
      throw new Error('Invalid subscription tier');
    }

    const usage = subscription.usage;
    const limits = tier.limits;

    const utilizationPercentage = {
      storage: limits.storageGB === -1 ? 0 : (usage.storageUsedGB / limits.storageGB) * 100,
      projects: limits.projectsPerMonth === -1 ? 0 : (usage.projectsCreated / limits.projectsPerMonth) * 100,
      aiProcessing: limits.aiProcessingMinutes === -1 ? 0 : (usage.aiProcessingMinutes / limits.aiProcessingMinutes) * 100,
      collaborators: limits.collaborators === -1 ? 0 : (usage.collaboratorsActive / limits.collaborators) * 100
    };

    return {
      ...usage,
      tierLimits: limits,
      utilizationPercentage
    };
  }

  async generateUsageReport(userId: string, period: { start: Date; end: Date }): Promise<any> {
    const subscription = this.userSubscriptions.get(userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    // This would typically query actual usage data from your database
    const mockReport = {
      period,
      subscription: {
        tier: subscription.tierId,
        status: subscription.status
      },
      usage: {
        projects: {
          created: subscription.usage.projectsCreated,
          active: Math.floor(subscription.usage.projectsCreated * 0.7),
          completed: Math.floor(subscription.usage.projectsCreated * 0.3)
        },
        storage: {
          used: subscription.usage.storageUsedGB,
          percentage: subscription.usage.storageUsedGB / this.subscriptionTiers.get(subscription.tierId)!.limits.storageGB * 100
        },
        ai: {
          minutesUsed: subscription.usage.aiProcessingMinutes,
          topFeatures: ['noise reduction', 'voice isolation', 'mastering']
        },
        exports: {
          total: subscription.usage.exportsGenerated,
          byFormat: {
            'mp3': Math.floor(subscription.usage.exportsGenerated * 0.6),
            'wav': Math.floor(subscription.usage.exportsGenerated * 0.3),
            'flac': Math.floor(subscription.usage.exportsGenerated * 0.1)
          }
        }
      },
      recommendations: this.generateUsageRecommendations(subscription)
    };

    return mockReport;
  }

  async addPaymentMethod(userId: string, paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>): Promise<PaymentMethod> {
    const method: PaymentMethod = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...paymentMethod,
      createdAt: new Date()
    };

    // In real implementation, securely store payment method with payment processor
    this.emit('paymentMethodAdded', { userId, paymentMethod: method });
    return method;
  }

  private createFreeSubscription(userId: string, tier: SubscriptionTier): UserSubscription {
    const subscription: UserSubscription = {
      id: `sub_free_${userId}`,
      userId,
      tierId: tier.id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      cancelAtPeriodEnd: false,
      usage: this.initializeUsageMetrics(),
      invoices: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userSubscriptions.set(userId, subscription);
    return subscription;
  }

  private initializeUsageMetrics(): UsageMetrics {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      period: {
        start: startOfMonth,
        end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)
      },
      projectsCreated: 0,
      storageUsedGB: 0,
      aiProcessingMinutes: 0,
      exportsGenerated: 0,
      collaboratorsActive: 0,
      apiCalls: 0
    };
  }

  private async createInvoice(subscription: UserSubscription, discount?: any): Promise<Invoice> {
    const tier = this.subscriptionTiers.get(subscription.tierId)!;
    let amount = tier.pricing.monthly;

    if (discount) {
      if (discount.type === 'percentage') {
        amount *= (100 - discount.value) / 100;
      } else if (discount.type === 'fixed_amount') {
        amount -= discount.value;
      }
    }

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      amount: Math.max(amount, 0),
      currency: tier.pricing.currency,
      status: 'open',
      created: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      items: [
        {
          description: `${tier.name} subscription`,
          amount,
          quantity: 1,
          period: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        }
      ],
      discount
    };

    return invoice;
  }

  private async processPayment(paymentMethodId: string, amount: number): Promise<void> {
    // Mock payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In real implementation, integrate with payment processor (Stripe, PayPal, etc.)
    this.emit('paymentProcessed', { paymentMethodId, amount });
  }

  private calculateProration(currentTier: SubscriptionTier, newTier: SubscriptionTier, remainingDays: number): number {
    const currentDailyRate = currentTier.pricing.monthly / 30;
    const newDailyRate = newTier.pricing.monthly / 30;
    const proratedCredit = currentDailyRate * remainingDays;
    const proratedCharge = newDailyRate * remainingDays;

    return Math.max(proratedCharge - proratedCredit, 0);
  }

  private hasUserUsedPromoCode(userId: string): boolean {
    // Check if user has previously used any promo codes
    // In real implementation, query database for user's promo code history
    return false; // Mock implementation
  }

  private generateUsageRecommendations(subscription: UserSubscription): string[] {
    const recommendations: string[] = [];
    const tier = this.subscriptionTiers.get(subscription.tierId)!;
    const usage = subscription.usage;

    // Storage recommendations
    const storageUtilization = usage.storageUsedGB / tier.limits.storageGB;
    if (storageUtilization > 0.8) {
      recommendations.push('Consider upgrading for more storage space');
    }

    // Project recommendations
    if (tier.limits.projectsPerMonth > 0) {
      const projectUtilization = usage.projectsCreated / tier.limits.projectsPerMonth;
      if (projectUtilization > 0.8) {
        recommendations.push('You\'re approaching your monthly project limit');
      }
    }

    // AI processing recommendations
    const aiUtilization = usage.aiProcessingMinutes / tier.limits.aiProcessingMinutes;
    if (aiUtilization > 0.9) {
      recommendations.push('Upgrade to get more AI processing minutes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your usage is well within limits. Keep creating!');
    }

    return recommendations;
  }

  // Public methods for retrieving data
  getSubscriptionTiers(): SubscriptionTier[] {
    return Array.from(this.subscriptionTiers.values());
  }

  getSubscriptionTier(tierId: string): SubscriptionTier | undefined {
    return this.subscriptionTiers.get(tierId);
  }

  getUserSubscription(userId: string): UserSubscription | undefined {
    return this.userSubscriptions.get(userId);
  }

  getActivePromoCodes(): PromoCode[] {
    const now = new Date();
    return Array.from(this.promoCodes.values())
      .filter(promo => promo.validUntil > now &&
        (promo.maxRedemptions === -1 || promo.currentRedemptions < promo.maxRedemptions));
  }

  async updateUsage(userId: string, usage: Partial<UsageMetrics>): Promise<void> {
    const subscription = this.userSubscriptions.get(userId);
    if (subscription) {
      Object.assign(subscription.usage, usage);
      subscription.updatedAt = new Date();
      this.userSubscriptions.set(userId, subscription);
      this.emit('usageUpdated', { userId, usage: subscription.usage });
    }
  }

  async checkLimits(userId: string, action: string): Promise<boolean> {
    const subscription = this.userSubscriptions.get(userId);
    if (!subscription) return false;

    const tier = this.subscriptionTiers.get(subscription.tierId);
    if (!tier) return false;

    switch (action) {
      case 'create_project':
        return tier.limits.projectsPerMonth === -1 ||
               subscription.usage.projectsCreated < tier.limits.projectsPerMonth;

      case 'ai_processing':
        return tier.limits.aiProcessingMinutes === -1 ||
               subscription.usage.aiProcessingMinutes < tier.limits.aiProcessingMinutes;

      case 'storage':
        return tier.limits.storageGB === -1 ||
               subscription.usage.storageUsedGB < tier.limits.storageGB;

      default:
        return true;
    }
  }
}

export const subscriptionManager = new SubscriptionManager();
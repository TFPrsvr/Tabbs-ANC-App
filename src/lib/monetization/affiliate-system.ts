import { EventEmitter } from 'events';

export interface AffiliateProgram {
  id: string;
  name: string;
  description: string;
  commissionStructure: CommissionTier[];
  cookieDuration: number; // days
  minPayoutAmount: number;
  payoutSchedule: 'monthly' | 'quarterly' | 'on-demand';
  terms: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface CommissionTier {
  tierName: string;
  minReferrals: number;
  subscriptionCommission: number; // percentage
  oneTimeCommission?: number; // fixed amount
  recurringMonths?: number; // how many months of recurring commission
  bonuses?: Array<{
    trigger: 'milestone' | 'performance' | 'seasonal';
    condition: string;
    reward: number;
  }>;
}

export interface Affiliate {
  id: string;
  userId: string;
  programId: string;
  status: 'pending' | 'approved' | 'suspended' | 'terminated';
  referralCode: string;
  customDomain?: string;
  profile: {
    businessName?: string;
    website?: string;
    socialMedia: Record<string, string>;
    audienceSize?: number;
    niche: string[];
    promotionMethods: string[];
  };
  performance: AffiliatePerformance;
  paymentInfo: {
    method: 'paypal' | 'bank_transfer' | 'stripe';
    details: Record<string, string>;
    taxId?: string;
  };
  appliedAt: Date;
  approvedAt?: Date;
}

export interface AffiliatePerformance {
  totalClicks: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  totalCommissionsEarned: number;
  totalCommissionsPaid: number;
  pendingCommissions: number;
  currentTier: string;
  lifetimeValue: number;
  topPerformingContent: Array<{
    type: 'blog' | 'video' | 'social' | 'email';
    url?: string;
    title: string;
    conversions: number;
    revenue: number;
  }>;
}

export interface Referral {
  id: string;
  affiliateId: string;
  referralCode: string;
  referredUserId?: string;
  clickId: string;
  source: {
    ip: string;
    userAgent: string;
    referrer?: string;
    utm: Record<string, string>;
  };
  status: 'clicked' | 'registered' | 'subscribed' | 'converted';
  subscriptionId?: string;
  clickedAt: Date;
  registeredAt?: Date;
  convertedAt?: Date;
  commission: {
    earned: number;
    status: 'pending' | 'approved' | 'paid' | 'reversed';
    approvedAt?: Date;
    paidAt?: Date;
  };
}

export interface Commission {
  id: string;
  affiliateId: string;
  referralId: string;
  type: 'subscription' | 'upgrade' | 'renewal' | 'bonus';
  amount: number;
  currency: string;
  tier: string;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  createdAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  payoutId?: string;
  notes?: string;
}

export interface Payout {
  id: string;
  affiliateId: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  commissions: string[]; // commission IDs
  scheduledAt: Date;
  processedAt?: Date;
  failureReason?: string;
  transactionId?: string;
}

export interface ReferralCampaign {
  id: string;
  name: string;
  description: string;
  type: 'affiliate' | 'customer_referral' | 'influencer';
  startDate: Date;
  endDate?: Date;
  incentives: {
    referrer: {
      type: 'commission' | 'credit' | 'discount' | 'gift';
      value: number;
      description: string;
    };
    referee: {
      type: 'discount' | 'trial_extension' | 'credit';
      value: number;
      description: string;
    };
  };
  rules: {
    maxReferrals?: number;
    minPurchaseAmount?: number;
    eligibleTiers: string[];
    geography?: string[];
  };
  performance: {
    totalReferrals: number;
    conversions: number;
    revenue: number;
    cost: number;
    roi: number;
  };
  isActive: boolean;
}

export class AffiliateSystem extends EventEmitter {
  private programs: Map<string, AffiliateProgram> = new Map();
  private affiliates: Map<string, Affiliate> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private commissions: Map<string, Commission> = new Map();
  private payouts: Map<string, Payout> = new Map();
  private campaigns: Map<string, ReferralCampaign> = new Map();

  constructor() {
    super();
    this.initializeDefaultProgram();
    this.initializeCampaigns();
  }

  private initializeDefaultProgram(): void {
    const defaultProgram: AffiliateProgram = {
      id: 'default-affiliate-program',
      name: 'ANC Audio Partner Program',
      description: 'Earn commissions by promoting our audio editing platform',
      commissionStructure: [
        {
          tierName: 'Starter',
          minReferrals: 0,
          subscriptionCommission: 20,
          recurringMonths: 6,
          bonuses: [
            {
              trigger: 'milestone',
              condition: '10_referrals',
              reward: 100
            }
          ]
        },
        {
          tierName: 'Growth',
          minReferrals: 25,
          subscriptionCommission: 25,
          recurringMonths: 8,
          bonuses: [
            {
              trigger: 'milestone',
              condition: '50_referrals',
              reward: 500
            },
            {
              trigger: 'performance',
              condition: 'top_10_monthly',
              reward: 200
            }
          ]
        },
        {
          tierName: 'Elite',
          minReferrals: 100,
          subscriptionCommission: 30,
          recurringMonths: 12,
          bonuses: [
            {
              trigger: 'milestone',
              condition: '200_referrals',
              reward: 1000
            },
            {
              trigger: 'seasonal',
              condition: 'black_friday',
              reward: 300
            }
          ]
        }
      ],
      cookieDuration: 30,
      minPayoutAmount: 50,
      payoutSchedule: 'monthly',
      terms: [
        'Affiliates must comply with our brand guidelines',
        'No paid search advertising on branded terms',
        'No spam or unsolicited email marketing',
        'Commissions are paid 30 days after customer payment'
      ],
      isActive: true,
      createdAt: new Date()
    };

    this.programs.set(defaultProgram.id, defaultProgram);
  }

  private initializeCampaigns(): void {
    const campaigns: ReferralCampaign[] = [
      {
        id: 'creator-referral-2024',
        name: 'Creator Referral Bonus',
        description: 'Special campaign for content creators',
        type: 'customer_referral',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        incentives: {
          referrer: {
            type: 'credit',
            value: 10,
            description: '$10 account credit per successful referral'
          },
          referee: {
            type: 'discount',
            value: 25,
            description: '25% off first month'
          }
        },
        rules: {
          maxReferrals: 50,
          eligibleTiers: ['pro', 'studio'],
          minPurchaseAmount: 19.99
        },
        performance: {
          totalReferrals: 0,
          conversions: 0,
          revenue: 0,
          cost: 0,
          roi: 0
        },
        isActive: true
      }
    ];

    campaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign);
    });
  }

  async applyForAffiliate(userId: string, application: any): Promise<Affiliate> {
    const referralCode = this.generateReferralCode(userId);

    const affiliate: Affiliate = {
      id: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      programId: 'default-affiliate-program',
      status: 'pending',
      referralCode,
      profile: {
        businessName: application.businessName,
        website: application.website,
        socialMedia: application.socialMedia || {},
        audienceSize: application.audienceSize,
        niche: application.niche || [],
        promotionMethods: application.promotionMethods || []
      },
      performance: {
        totalClicks: 0,
        uniqueVisitors: 0,
        conversions: 0,
        conversionRate: 0,
        totalCommissionsEarned: 0,
        totalCommissionsPaid: 0,
        pendingCommissions: 0,
        currentTier: 'Starter',
        lifetimeValue: 0,
        topPerformingContent: []
      },
      paymentInfo: application.paymentInfo,
      appliedAt: new Date()
    };

    this.affiliates.set(affiliate.id, affiliate);
    this.emit('affiliateApplicationSubmitted', affiliate);

    // Auto-approve if meets basic criteria
    if (this.shouldAutoApprove(affiliate)) {
      await this.approveAffiliate(affiliate.id);
    }

    return affiliate;
  }

  async approveAffiliate(affiliateId: string, notes?: string): Promise<void> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    affiliate.status = 'approved';
    affiliate.approvedAt = new Date();

    this.affiliates.set(affiliateId, affiliate);
    this.emit('affiliateApproved', { affiliate, notes });

    // Send welcome email with promotional materials
    this.sendAffiliateWelcomeKit(affiliate);
  }

  async trackClick(referralCode: string, clickData: any): Promise<string> {
    const affiliate = Array.from(this.affiliates.values())
      .find(aff => aff.referralCode === referralCode);

    if (!affiliate || affiliate.status !== 'approved') {
      throw new Error('Invalid or inactive referral code');
    }

    const clickId = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const referral: Referral = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateId: affiliate.id,
      referralCode,
      clickId,
      source: {
        ip: clickData.ip,
        userAgent: clickData.userAgent,
        referrer: clickData.referrer,
        utm: clickData.utm || {}
      },
      status: 'clicked',
      clickedAt: new Date(),
      commission: {
        earned: 0,
        status: 'pending'
      }
    };

    this.referrals.set(referral.id, referral);

    // Update affiliate performance
    affiliate.performance.totalClicks++;
    this.affiliates.set(affiliate.id, affiliate);

    this.emit('referralClicked', { affiliate, referral, clickData });

    return clickId;
  }

  async trackConversion(
    clickId: string,
    userId: string,
    subscriptionId: string,
    subscriptionAmount: number
  ): Promise<Commission | null> {
    const referral = Array.from(this.referrals.values())
      .find(ref => ref.clickId === clickId);

    if (!referral) {
      return null; // No tracked referral found
    }

    const affiliate = this.affiliates.get(referral.affiliateId);
    if (!affiliate) {
      return null;
    }

    // Check if conversion is within cookie duration
    const daysSinceClick = (Date.now() - referral.clickedAt.getTime()) / (24 * 60 * 60 * 1000);
    const program = this.programs.get(affiliate.programId)!;

    if (daysSinceClick > program.cookieDuration) {
      return null; // Conversion outside attribution window
    }

    // Update referral
    referral.status = 'converted';
    referral.referredUserId = userId;
    referral.subscriptionId = subscriptionId;
    referral.convertedAt = new Date();

    // Calculate commission
    const currentTier = this.getCurrentTier(affiliate);
    const commissionRate = currentTier.subscriptionCommission / 100;
    const commissionAmount = subscriptionAmount * commissionRate;

    const commission: Commission = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateId: affiliate.id,
      referralId: referral.id,
      type: 'subscription',
      amount: commissionAmount,
      currency: 'USD',
      tier: currentTier.tierName,
      status: 'pending',
      createdAt: new Date()
    };

    referral.commission = {
      earned: commissionAmount,
      status: 'pending'
    };

    // Update affiliate performance
    affiliate.performance.conversions++;
    affiliate.performance.conversionRate = (affiliate.performance.conversions / affiliate.performance.totalClicks) * 100;
    affiliate.performance.totalCommissionsEarned += commissionAmount;
    affiliate.performance.pendingCommissions += commissionAmount;
    affiliate.performance.lifetimeValue += subscriptionAmount;

    // Check for tier upgrade
    await this.checkTierUpgrade(affiliate);

    // Store updates
    this.referrals.set(referral.id, referral);
    this.commissions.set(commission.id, commission);
    this.affiliates.set(affiliate.id, affiliate);

    this.emit('conversionTracked', { affiliate, referral, commission });

    return commission;
  }

  async generatePayouts(): Promise<Payout[]> {
    const payouts: Payout[] = [];

    for (const affiliate of this.affiliates.values()) {
      if (affiliate.status !== 'approved') continue;

      const pendingCommissions = Array.from(this.commissions.values())
        .filter(comm =>
          comm.affiliateId === affiliate.id &&
          comm.status === 'approved' &&
          !comm.paidAt
        );

      const totalAmount = pendingCommissions.reduce((sum, comm) => sum + comm.amount, 0);
      const program = this.programs.get(affiliate.programId)!;

      if (totalAmount >= program.minPayoutAmount) {
        const payout: Payout = {
          id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          affiliateId: affiliate.id,
          amount: totalAmount,
          currency: 'USD',
          method: affiliate.paymentInfo.method,
          status: 'pending',
          commissions: pendingCommissions.map(c => c.id),
          scheduledAt: new Date()
        };

        payouts.push(payout);
        this.payouts.set(payout.id, payout);

        // Mark commissions as being paid
        pendingCommissions.forEach(commission => {
          commission.status = 'paid';
          commission.paidAt = new Date();
          commission.payoutId = payout.id;
          this.commissions.set(commission.id, commission);
        });

        // Update affiliate balances
        affiliate.performance.totalCommissionsPaid += totalAmount;
        affiliate.performance.pendingCommissions -= totalAmount;
        this.affiliates.set(affiliate.id, affiliate);
      }
    }

    if (payouts.length > 0) {
      this.emit('payoutsGenerated', payouts);
    }

    return payouts;
  }

  async getAffiliateAnalytics(affiliateId: string, period: { start: Date; end: Date }): Promise<any> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const referrals = Array.from(this.referrals.values())
      .filter(ref =>
        ref.affiliateId === affiliateId &&
        ref.clickedAt >= period.start &&
        ref.clickedAt <= period.end
      );

    const commissions = Array.from(this.commissions.values())
      .filter(comm =>
        comm.affiliateId === affiliateId &&
        comm.createdAt >= period.start &&
        comm.createdAt <= period.end
      );

    const analytics = {
      period,
      summary: {
        clicks: referrals.length,
        conversions: referrals.filter(r => r.status === 'converted').length,
        conversionRate: referrals.length > 0 ?
          (referrals.filter(r => r.status === 'converted').length / referrals.length) * 100 : 0,
        commissionsEarned: commissions.reduce((sum, c) => sum + c.amount, 0),
        averageOrderValue: commissions.length > 0 ?
          commissions.reduce((sum, c) => sum + c.amount, 0) / commissions.length : 0
      },
      trends: {
        dailyClicks: this.aggregateByDay(referrals, 'clickedAt'),
        dailyConversions: this.aggregateByDay(
          referrals.filter(r => r.status === 'converted'),
          'convertedAt'
        ),
        dailyCommissions: this.aggregateByDay(commissions, 'createdAt', 'amount')
      },
      topSources: this.getTopSources(referrals),
      performance: affiliate.performance
    };

    return analytics;
  }

  async createReferralCampaign(campaign: Omit<ReferralCampaign, 'id' | 'performance'>): Promise<ReferralCampaign> {
    const newCampaign: ReferralCampaign = {
      id: `campaign_${Date.now()}`,
      ...campaign,
      performance: {
        totalReferrals: 0,
        conversions: 0,
        revenue: 0,
        cost: 0,
        roi: 0
      }
    };

    this.campaigns.set(newCampaign.id, newCampaign);
    this.emit('campaignCreated', newCampaign);

    return newCampaign;
  }

  async generateReferralLink(userId: string, campaignId?: string): Promise<string> {
    let affiliate = Array.from(this.affiliates.values())
      .find(aff => aff.userId === userId);

    if (!affiliate) {
      // Create customer referral entry
      const referralCode = this.generateReferralCode(userId);
      affiliate = {
        id: `cust_ref_${userId}`,
        userId,
        programId: 'customer-referral',
        status: 'approved',
        referralCode,
        profile: {
          niche: [],
          promotionMethods: ['word-of-mouth'],
          socialMedia: {}
        },
        performance: {
          totalClicks: 0,
          uniqueVisitors: 0,
          conversions: 0,
          conversionRate: 0,
          totalCommissionsEarned: 0,
          totalCommissionsPaid: 0,
          pendingCommissions: 0,
          currentTier: 'Starter',
          lifetimeValue: 0,
          topPerformingContent: []
        },
        paymentInfo: {
          method: 'paypal',
          details: {}
        },
        appliedAt: new Date(),
        approvedAt: new Date()
      };

      this.affiliates.set(affiliate.id, affiliate);
    }

    const baseUrl = 'https://anc-audio.com/signup';
    const params = new URLSearchParams({
      ref: affiliate.referralCode
    });

    if (campaignId) {
      params.set('campaign', campaignId);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  private generateReferralCode(userId: string): string {
    const randomSuffix = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ANC${userId.substr(-4).toUpperCase()}${randomSuffix}`;
  }

  private shouldAutoApprove(affiliate: Affiliate): boolean {
    // Auto-approve if has website and social media presence
    return !!(affiliate.profile.website &&
             Object.keys(affiliate.profile.socialMedia).length > 0 &&
             affiliate.profile.audienceSize && affiliate.profile.audienceSize > 1000);
  }

  private getCurrentTier(affiliate: Affiliate): CommissionTier {
    const program = this.programs.get(affiliate.programId)!;
    const tiers = program.commissionStructure
      .sort((a, b) => b.minReferrals - a.minReferrals);

    for (const tier of tiers) {
      if (affiliate.performance.conversions >= tier.minReferrals) {
        return tier;
      }
    }

    return program.commissionStructure[0];
  }

  private async checkTierUpgrade(affiliate: Affiliate): Promise<void> {
    const currentTierName = affiliate.performance.currentTier;
    const newTier = this.getCurrentTier(affiliate);

    if (newTier.tierName !== currentTierName) {
      affiliate.performance.currentTier = newTier.tierName;
      this.emit('tierUpgraded', {
        affiliate,
        oldTier: currentTierName,
        newTier: newTier.tierName
      });
    }
  }

  private aggregateByDay(data: any[], dateField: string, valueField?: string): Array<{date: Date, value: number}> {
    const grouped = new Map<string, number>();

    data.forEach(item => {
      if (!item[dateField]) return;

      const date = new Date(item[dateField]);
      const dayKey = date.toISOString().split('T')[0];

      const value = valueField ? (item[valueField] || 0) : 1;
      grouped.set(dayKey, (grouped.get(dayKey) || 0) + value);
    });

    return Array.from(grouped.entries()).map(([dateStr, value]) => ({
      date: new Date(dateStr),
      value
    }));
  }

  private getTopSources(referrals: Referral[]): Array<{source: string, clicks: number}> {
    const sources = new Map<string, number>();

    referrals.forEach(referral => {
      const source = referral.source.utm.utm_source ||
                    referral.source.referrer ||
                    'direct';
      sources.set(source, (sources.get(source) || 0) + 1);
    });

    return Array.from(sources.entries())
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }

  private async sendAffiliateWelcomeKit(affiliate: Affiliate): Promise<void> {
    // Send welcome email with promotional materials
    this.emit('sendWelcomeKit', {
      affiliate,
      materials: {
        referralLink: `https://anc-audio.com/signup?ref=${affiliate.referralCode}`,
        banners: ['728x90', '300x250', '160x600'],
        textLinks: ['Try ANC Audio Free', 'Professional Audio Editing'],
        guidelines: 'Brand and promotion guidelines document'
      }
    });
  }

  // Public getters
  getAffiliate(affiliateId: string): Affiliate | undefined {
    return this.affiliates.get(affiliateId);
  }

  getAffiliateByUserId(userId: string): Affiliate | undefined {
    return Array.from(this.affiliates.values())
      .find(aff => aff.userId === userId);
  }

  getAffiliateByCode(code: string): Affiliate | undefined {
    return Array.from(this.affiliates.values())
      .find(aff => aff.referralCode === code);
  }

  getAllAffiliates(): Affiliate[] {
    return Array.from(this.affiliates.values());
  }

  getPendingApplications(): Affiliate[] {
    return Array.from(this.affiliates.values())
      .filter(aff => aff.status === 'pending');
  }

  getTopPerformers(limit: number = 10): Affiliate[] {
    return Array.from(this.affiliates.values())
      .filter(aff => aff.status === 'approved')
      .sort((a, b) => b.performance.totalCommissionsEarned - a.performance.totalCommissionsEarned)
      .slice(0, limit);
  }

  getCommissionsByAffiliate(affiliateId: string): Commission[] {
    return Array.from(this.commissions.values())
      .filter(comm => comm.affiliateId === affiliateId);
  }

  getPendingPayouts(): Payout[] {
    return Array.from(this.payouts.values())
      .filter(payout => payout.status === 'pending');
  }

  getReferralCampaign(campaignId: string): ReferralCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  getActiveCampaigns(): ReferralCampaign[] {
    const now = new Date();
    return Array.from(this.campaigns.values())
      .filter(campaign =>
        campaign.isActive &&
        campaign.startDate <= now &&
        (!campaign.endDate || campaign.endDate >= now)
      );
  }
}

export const affiliateSystem = new AffiliateSystem();
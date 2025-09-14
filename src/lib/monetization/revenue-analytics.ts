import { EventEmitter } from 'events';

export interface RevenueMetrics {
  period: { start: Date; end: Date };
  totalRevenue: number;
  recurringRevenue: {
    monthly: number;
    annual: number;
    mrr: number; // Monthly Recurring Revenue
    arr: number; // Annual Recurring Revenue
  };
  subscriptions: {
    new: number;
    churned: number;
    upgraded: number;
    downgraded: number;
    netGrowth: number;
    churnRate: number;
  };
  customerMetrics: {
    totalCustomers: number;
    activeSubscribers: number;
    trialUsers: number;
    conversionRate: number;
    averageRevenuePerUser: number;
    customerLifetimeValue: number;
  };
  tierBreakdown: Record<string, {
    subscribers: number;
    revenue: number;
    percentage: number;
  }>;
}

export interface CohortAnalysis {
  cohort: string; // e.g., "2024-01"
  period: number; // months since signup
  subscribers: number;
  revenue: number;
  retentionRate: number;
  churnRate: number;
}

export interface RevenueForecasting {
  method: 'linear' | 'exponential' | 'arima';
  period: { start: Date; end: Date };
  predictions: Array<{
    date: Date;
    predictedRevenue: number;
    confidence: { lower: number; upper: number };
    actualRevenue?: number;
  }>;
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
}

export interface FinancialReport {
  id: string;
  type: 'monthly' | 'quarterly' | 'annual';
  period: { start: Date; end: Date };
  revenue: {
    gross: number;
    net: number;
    recurring: number;
    oneTime: number;
  };
  costs: {
    customerAcquisition: number;
    serverInfrastructure: number;
    paymentProcessing: number;
    refunds: number;
    chargebacks: number;
  };
  profitability: {
    grossMargin: number;
    netMargin: number;
    ebitda: number;
  };
  kpis: {
    cac: number; // Customer Acquisition Cost
    ltv: number; // Lifetime Value
    ltvCacRatio: number;
    paybackPeriod: number; // months
  };
  generatedAt: Date;
}

export interface PaymentAnalytics {
  successRate: number;
  failureReasons: Record<string, number>;
  averageTransactionValue: number;
  peakTransactionHours: number[];
  chargebackRate: number;
  refundRate: number;
  popularPaymentMethods: Record<string, number>;
  geographicBreakdown: Record<string, {
    revenue: number;
    subscribers: number;
    conversionRate: number;
  }>;
}

export interface PredictiveInsights {
  churnRisk: Array<{
    userId: string;
    riskScore: number;
    factors: string[];
    recommendedActions: string[];
  }>;
  upsellOpportunities: Array<{
    userId: string;
    currentTier: string;
    suggestedTier: string;
    probability: number;
    reasoning: string[];
  }>;
  priceOptimization: {
    currentPricing: Record<string, number>;
    suggestedPricing: Record<string, number>;
    expectedImpact: {
      revenueChange: number;
      subscriptionChange: number;
    };
  };
}

export class RevenueAnalyticsEngine extends EventEmitter {
  private revenueData: Map<string, RevenueMetrics> = new Map();
  private cohortData: Map<string, CohortAnalysis[]> = new Map();
  private financialReports: Map<string, FinancialReport> = new Map();
  private predictiveModels: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializePredictiveModels();
  }

  async generateRevenueMetrics(period: { start: Date; end: Date }): Promise<RevenueMetrics> {
    try {
      // In a real implementation, this would query your database
      const metrics = await this.calculateRevenueMetrics(period);

      const periodKey = `${period.start.toISOString()}_${period.end.toISOString()}`;
      this.revenueData.set(periodKey, metrics);

      this.emit('metricsGenerated', { period, metrics });
      return metrics;
    } catch (error) {
      this.emit('error', { type: 'metrics_generation', error: error.message });
      throw error;
    }
  }

  async performCohortAnalysis(cohortMonth: string): Promise<CohortAnalysis[]> {
    try {
      const cohortData = await this.calculateCohortMetrics(cohortMonth);
      this.cohortData.set(cohortMonth, cohortData);

      this.emit('cohortAnalysisComplete', { cohort: cohortMonth, data: cohortData });
      return cohortData;
    } catch (error) {
      this.emit('error', { type: 'cohort_analysis', error: error.message });
      throw error;
    }
  }

  async generateFinancialReport(
    type: 'monthly' | 'quarterly' | 'annual',
    period: { start: Date; end: Date }
  ): Promise<FinancialReport> {
    try {
      const report = await this.compileFinancialReport(type, period);
      this.financialReports.set(report.id, report);

      this.emit('financialReportGenerated', report);
      return report;
    } catch (error) {
      this.emit('error', { type: 'financial_report', error: error.message });
      throw error;
    }
  }

  async forecastRevenue(
    method: 'linear' | 'exponential' | 'arima',
    forecastPeriod: number // months
  ): Promise<RevenueForecasting> {
    try {
      const historicalData = this.getHistoricalRevenueData();
      const forecast = await this.runForecastingModel(method, historicalData, forecastPeriod);

      this.emit('forecastGenerated', forecast);
      return forecast;
    } catch (error) {
      this.emit('error', { type: 'revenue_forecasting', error: error.message });
      throw error;
    }
  }

  async analyzePaymentTrends(period: { start: Date; end: Date }): Promise<PaymentAnalytics> {
    try {
      const analytics = await this.calculatePaymentAnalytics(period);
      this.emit('paymentAnalyticsComplete', { period, analytics });
      return analytics;
    } catch (error) {
      this.emit('error', { type: 'payment_analytics', error: error.message });
      throw error;
    }
  }

  async generatePredictiveInsights(): Promise<PredictiveInsights> {
    try {
      const churnModel = this.predictiveModels.get('churn');
      const upsellModel = this.predictiveModels.get('upsell');
      const pricingModel = this.predictiveModels.get('pricing');

      const insights: PredictiveInsights = {
        churnRisk: await this.predictChurnRisk(churnModel),
        upsellOpportunities: await this.identifyUpsellOpportunities(upsellModel),
        priceOptimization: await this.optimizePricing(pricingModel)
      };

      this.emit('predictiveInsightsGenerated', insights);
      return insights;
    } catch (error) {
      this.emit('error', { type: 'predictive_insights', error: error.message });
      throw error;
    }
  }

  async generateDashboardData(): Promise<any> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMetrics = await this.generateRevenueMetrics({
      start: currentMonth,
      end: now
    });

    const previousMetrics = await this.generateRevenueMetrics({
      start: lastMonth,
      end: currentMonth
    });

    const paymentTrends = await this.analyzePaymentTrends({
      start: lastMonth,
      end: now
    });

    const insights = await this.generatePredictiveInsights();

    return {
      overview: {
        mrr: currentMetrics.recurringRevenue.mrr,
        mrrGrowth: this.calculateGrowthRate(
          currentMetrics.recurringRevenue.mrr,
          previousMetrics.recurringRevenue.mrr
        ),
        totalRevenue: currentMetrics.totalRevenue,
        revenueGrowth: this.calculateGrowthRate(
          currentMetrics.totalRevenue,
          previousMetrics.totalRevenue
        ),
        activeSubscribers: currentMetrics.customerMetrics.activeSubscribers,
        subscriberGrowth: this.calculateGrowthRate(
          currentMetrics.customerMetrics.activeSubscribers,
          previousMetrics.customerMetrics.activeSubscribers
        ),
        churnRate: currentMetrics.subscriptions.churnRate,
        conversionRate: currentMetrics.customerMetrics.conversionRate
      },
      charts: {
        revenueOverTime: this.getRevenueTimeSeries(),
        subscriptionTrends: this.getSubscriptionTrends(),
        cohortRetention: this.getCohortRetentionMatrix(),
        tierDistribution: currentMetrics.tierBreakdown
      },
      insights: {
        churnRiskUsers: insights.churnRisk.slice(0, 10),
        upsellOpportunities: insights.upsellOpportunities.slice(0, 10),
        keyMetrics: this.identifyKeyTrends(currentMetrics, previousMetrics)
      },
      paymentHealth: {
        successRate: paymentTrends.successRate,
        failureReasons: paymentTrends.failureReasons,
        chargebackRate: paymentTrends.chargebackRate,
        refundRate: paymentTrends.refundRate
      }
    };
  }

  async exportFinancialData(
    format: 'csv' | 'xlsx' | 'pdf',
    period: { start: Date; end: Date }
  ): Promise<Blob> {
    const metrics = await this.generateRevenueMetrics(period);
    const report = await this.generateFinancialReport('monthly', period);

    switch (format) {
      case 'csv':
        return this.exportToCsv(metrics, report);
      case 'xlsx':
        return this.exportToExcel(metrics, report);
      case 'pdf':
        return this.exportToPdf(metrics, report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async calculateRevenueMetrics(period: { start: Date; end: Date }): Promise<RevenueMetrics> {
    // Mock implementation - in reality, query your database
    const totalRevenue = 125000 + Math.random() * 10000;
    const mrr = 95000 + Math.random() * 5000;
    const activeSubscribers = 1250 + Math.floor(Math.random() * 100);

    return {
      period,
      totalRevenue,
      recurringRevenue: {
        monthly: mrr * 0.7,
        annual: mrr * 0.3,
        mrr,
        arr: mrr * 12
      },
      subscriptions: {
        new: 45 + Math.floor(Math.random() * 10),
        churned: 12 + Math.floor(Math.random() * 5),
        upgraded: 8 + Math.floor(Math.random() * 3),
        downgraded: 3 + Math.floor(Math.random() * 2),
        netGrowth: 33,
        churnRate: 2.1 + Math.random() * 0.8
      },
      customerMetrics: {
        totalCustomers: activeSubscribers + 150,
        activeSubscribers,
        trialUsers: 89 + Math.floor(Math.random() * 20),
        conversionRate: 18.5 + Math.random() * 3,
        averageRevenuePerUser: totalRevenue / activeSubscribers,
        customerLifetimeValue: 1200 + Math.random() * 300
      },
      tierBreakdown: {
        free: { subscribers: 450, revenue: 0, percentage: 0 },
        pro: { subscribers: 800, revenue: totalRevenue * 0.6, percentage: 60 },
        studio: { subscribers: 350, revenue: totalRevenue * 0.35, percentage: 35 },
        enterprise: { subscribers: 50, revenue: totalRevenue * 0.05, percentage: 5 }
      }
    };
  }

  private async calculateCohortMetrics(cohortMonth: string): Promise<CohortAnalysis[]> {
    const cohortData: CohortAnalysis[] = [];

    // Generate mock cohort data for 12 months
    for (let period = 0; period < 12; period++) {
      const baseRetention = 0.9;
      const decayRate = 0.08;
      const retentionRate = baseRetention * Math.pow(1 - decayRate, period);

      cohortData.push({
        cohort: cohortMonth,
        period,
        subscribers: Math.floor(100 * retentionRate),
        revenue: Math.floor(2000 * retentionRate),
        retentionRate: retentionRate * 100,
        churnRate: (1 - retentionRate) * 100
      });
    }

    return cohortData;
  }

  private async compileFinancialReport(
    type: 'monthly' | 'quarterly' | 'annual',
    period: { start: Date; end: Date }
  ): Promise<FinancialReport> {
    const grossRevenue = 125000;
    const costs = {
      customerAcquisition: 25000,
      serverInfrastructure: 8000,
      paymentProcessing: 3750,
      refunds: 2500,
      chargebacks: 500
    };

    const totalCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    const netRevenue = grossRevenue - totalCosts;

    return {
      id: `report_${type}_${Date.now()}`,
      type,
      period,
      revenue: {
        gross: grossRevenue,
        net: netRevenue,
        recurring: grossRevenue * 0.85,
        oneTime: grossRevenue * 0.15
      },
      costs,
      profitability: {
        grossMargin: (grossRevenue - costs.paymentProcessing) / grossRevenue * 100,
        netMargin: netRevenue / grossRevenue * 100,
        ebitda: netRevenue + costs.serverInfrastructure
      },
      kpis: {
        cac: costs.customerAcquisition / 45, // assuming 45 new customers
        ltv: 1200,
        ltvCacRatio: 1200 / (costs.customerAcquisition / 45),
        paybackPeriod: 8.5
      },
      generatedAt: new Date()
    };
  }

  private getHistoricalRevenueData(): Array<{ date: Date; revenue: number }> {
    const data = [];
    const now = new Date();

    for (let i = 12; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const baseRevenue = 80000;
      const growth = i * 2000;
      const noise = (Math.random() - 0.5) * 5000;

      data.push({
        date,
        revenue: baseRevenue + growth + noise
      });
    }

    return data;
  }

  private async runForecastingModel(
    method: string,
    historicalData: Array<{ date: Date; revenue: number }>,
    forecastPeriod: number
  ): Promise<RevenueForecasting> {
    const predictions = [];
    const lastRevenue = historicalData[historicalData.length - 1].revenue;

    for (let i = 1; i <= forecastPeriod; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);

      let predictedRevenue;
      switch (method) {
        case 'linear':
          predictedRevenue = lastRevenue + (i * 2000); // Linear growth
          break;
        case 'exponential':
          predictedRevenue = lastRevenue * Math.pow(1.05, i); // 5% monthly growth
          break;
        case 'arima':
          predictedRevenue = lastRevenue * (1 + 0.03 * i + Math.sin(i) * 0.01); // Seasonal pattern
          break;
        default:
          predictedRevenue = lastRevenue;
      }

      const confidence = Math.max(0.1, 0.9 - (i * 0.05)); // Decreasing confidence
      const margin = predictedRevenue * 0.2;

      predictions.push({
        date,
        predictedRevenue,
        confidence: {
          lower: predictedRevenue - margin,
          upper: predictedRevenue + margin
        }
      });
    }

    return {
      method,
      period: {
        start: new Date(),
        end: predictions[predictions.length - 1].date
      },
      predictions,
      accuracy: {
        mape: 5.2 + Math.random() * 2, // Mock accuracy metrics
        rmse: 3500 + Math.random() * 1000
      }
    };
  }

  private async calculatePaymentAnalytics(period: { start: Date; end: Date }): Promise<PaymentAnalytics> {
    return {
      successRate: 95.5 + Math.random() * 3,
      failureReasons: {
        'insufficient_funds': 35,
        'expired_card': 25,
        'declined_by_issuer': 20,
        'invalid_cvc': 10,
        'other': 10
      },
      averageTransactionValue: 32.50 + Math.random() * 10,
      peakTransactionHours: [9, 10, 14, 15, 19, 20],
      chargebackRate: 0.3 + Math.random() * 0.2,
      refundRate: 2.1 + Math.random() * 0.5,
      popularPaymentMethods: {
        'credit_card': 70,
        'paypal': 20,
        'bank_transfer': 8,
        'apple_pay': 2
      },
      geographicBreakdown: {
        'US': { revenue: 65000, subscribers: 650, conversionRate: 22.1 },
        'UK': { revenue: 20000, subscribers: 280, conversionRate: 19.5 },
        'CA': { revenue: 15000, subscribers: 180, conversionRate: 18.2 },
        'AU': { revenue: 12000, subscribers: 140, conversionRate: 17.8 },
        'DE': { revenue: 8000, subscribers: 120, conversionRate: 16.9 }
      }
    };
  }

  private async predictChurnRisk(model: any): Promise<Array<any>> {
    // Mock churn prediction
    const riskUsers = [];
    for (let i = 0; i < 20; i++) {
      riskUsers.push({
        userId: `user_${1000 + i}`,
        riskScore: 0.3 + Math.random() * 0.6,
        factors: [
          'decreased_usage',
          'payment_failures',
          'no_recent_exports',
          'support_tickets'
        ].slice(0, Math.floor(Math.random() * 4) + 1),
        recommendedActions: [
          'Send re-engagement email',
          'Offer usage tutorial',
          'Provide discount incentive',
          'Schedule customer success call'
        ]
      });
    }

    return riskUsers.sort((a, b) => b.riskScore - a.riskScore);
  }

  private async identifyUpsellOpportunities(model: any): Promise<Array<any>> {
    // Mock upsell identification
    const opportunities = [];
    for (let i = 0; i < 15; i++) {
      opportunities.push({
        userId: `user_${2000 + i}`,
        currentTier: 'pro',
        suggestedTier: 'studio',
        probability: 0.4 + Math.random() * 0.4,
        reasoning: [
          'High usage of advanced features',
          'Approaching storage limits',
          'Multiple active projects',
          'Team collaboration needs'
        ]
      });
    }

    return opportunities.sort((a, b) => b.probability - a.probability);
  }

  private async optimizePricing(model: any): Promise<any> {
    return {
      currentPricing: {
        pro: 19.99,
        studio: 49.99,
        enterprise: 199.99
      },
      suggestedPricing: {
        pro: 22.99,
        studio: 54.99,
        enterprise: 219.99
      },
      expectedImpact: {
        revenueChange: 12.5, // percent increase
        subscriptionChange: -3.2 // percent decrease due to price sensitivity
      }
    };
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private getRevenueTimeSeries(): Array<{ date: Date; revenue: number }> {
    return this.getHistoricalRevenueData();
  }

  private getSubscriptionTrends(): Array<{ date: Date; new: number; churned: number }> {
    const trends = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trends.push({
        date,
        new: 35 + Math.floor(Math.random() * 20),
        churned: 8 + Math.floor(Math.random() * 8)
      });
    }

    return trends;
  }

  private getCohortRetentionMatrix(): Array<Array<number>> {
    const matrix = [];
    for (let cohort = 0; cohort < 6; cohort++) {
      const row = [];
      for (let period = 0; period <= cohort; period++) {
        const retention = Math.max(0.2, 0.9 - (period * 0.08));
        row.push(Math.round(retention * 100));
      }
      matrix.push(row);
    }
    return matrix;
  }

  private identifyKeyTrends(current: RevenueMetrics, previous: RevenueMetrics): Array<string> {
    const trends = [];

    const mrrGrowth = this.calculateGrowthRate(current.recurringRevenue.mrr, previous.recurringRevenue.mrr);
    if (mrrGrowth > 10) {
      trends.push(`Strong MRR growth of ${mrrGrowth.toFixed(1)}%`);
    }

    if (current.subscriptions.churnRate < previous.subscriptions.churnRate) {
      trends.push('Churn rate is improving');
    }

    const conversionImprovement = current.customerMetrics.conversionRate - previous.customerMetrics.conversionRate;
    if (conversionImprovement > 1) {
      trends.push(`Conversion rate increased by ${conversionImprovement.toFixed(1)}pp`);
    }

    return trends;
  }

  private async exportToCsv(metrics: RevenueMetrics, report: FinancialReport): Promise<Blob> {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', metrics.totalRevenue.toString()],
      ['MRR', metrics.recurringRevenue.mrr.toString()],
      ['Active Subscribers', metrics.customerMetrics.activeSubscribers.toString()],
      ['Churn Rate', metrics.subscriptions.churnRate.toString()],
      ['Conversion Rate', metrics.customerMetrics.conversionRate.toString()],
      ['Customer LTV', metrics.customerMetrics.customerLifetimeValue.toString()]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    return new Blob([csvContent], { type: 'text/csv' });
  }

  private async exportToExcel(metrics: RevenueMetrics, report: FinancialReport): Promise<Blob> {
    // Mock Excel export - in reality, use a library like xlsx
    const mockExcelData = 'Mock Excel data would be generated here';
    return new Blob([mockExcelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private async exportToPdf(metrics: RevenueMetrics, report: FinancialReport): Promise<Blob> {
    // Mock PDF export - in reality, use a library like jsPDF or puppeteer
    const mockPdfData = 'Mock PDF data would be generated here';
    return new Blob([mockPdfData], { type: 'application/pdf' });
  }

  private initializePredictiveModels(): void {
    // Initialize machine learning models for predictions
    this.predictiveModels.set('churn', { type: 'logistic_regression' });
    this.predictiveModels.set('upsell', { type: 'random_forest' });
    this.predictiveModels.set('pricing', { type: 'neural_network' });
  }

  // Public getters
  getRevenueMetrics(periodKey: string): RevenueMetrics | undefined {
    return this.revenueData.get(periodKey);
  }

  getCohortData(cohort: string): CohortAnalysis[] | undefined {
    return this.cohortData.get(cohort);
  }

  getFinancialReport(reportId: string): FinancialReport | undefined {
    return this.financialReports.get(reportId);
  }

  getAllReports(): FinancialReport[] {
    return Array.from(this.financialReports.values());
  }
}

export const revenueAnalytics = new RevenueAnalyticsEngine();
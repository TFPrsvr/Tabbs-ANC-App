"use client";

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { StripeService } from '@/lib/payments/stripe';
import { stripePlans } from '@/config/payments/stripe';
import { useAuth } from '@clerk/nextjs';
import { Check, Zap, Crown, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PricingCards() {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, priceId: string) => {
    if (!userId || !priceId) return;
    
    setIsLoading(planId);
    
    try {
      const sessionId = await StripeService.createCheckoutSession(priceId, userId);
      await StripeService.redirectToCheckout(sessionId);
    } catch (error) {
      console.error('Error starting checkout:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Zap className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      case 'pro': return <Rocket className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getPlanGradient = (planId: string) => {
    switch (planId) {
      case 'free': return 'from-green-500 to-emerald-600';
      case 'premium': return 'from-purple-500 to-violet-600';
      case 'pro': return 'from-orange-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of advanced audio processing
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {stripePlans.map((plan) => (
          <Card 
            key={plan.id}
            className={cn(
              "relative transition-all duration-200 hover:scale-105",
              plan.popular && "ring-2 ring-purple-500 ring-offset-2"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader className="text-center pb-8">
              <div className={cn(
                "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-r text-white",
                getPlanGradient(plan.id)
              )}>
                {getPlanIcon(plan.id)}
              </div>
              
              <CardTitle className="text-2xl font-bold mb-2">
                {plan.name}
              </CardTitle>
              
              <div className="text-center">
                <span className="text-4xl font-bold">
                  ${plan.price}
                </span>
                <span className="text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                {plan.id === 'free' ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? 'audio' : 'default'}
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                    disabled={isLoading === plan.id || !userId}
                  >
                    {isLoading === plan.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Files: {plan.maxFiles === -1 ? 'Unlimited' : plan.maxFiles}</p>
                <p>Duration: {plan.maxDuration === -1 ? 'Unlimited' : `${Math.floor(plan.maxDuration / 60)} min`}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          All plans include SSL encryption, GDPR compliance, and 24/7 support
        </p>
        <p className="text-xs text-muted-foreground">
          Prices shown in USD. Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
"use client";

import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EMOJIS } from '@/constants';
import Link from 'next/link';
import { Headphones, Mic, Volume2, Settings, Zap, Shield } from 'lucide-react';

export default function Home() {
  const { isSignedIn, user } = useUser();

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Welcome back, {user?.firstName || 'User'}! {EMOJIS.HEADPHONES}
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Ready to process some audio?
            </p>
            <Link href="/dashboard">
              <Button size="lg" variant="audio" className="text-lg px-8 py-3">
                {EMOJIS.DASHBOARD} Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Headphones className="w-20 h-20 text-purple-600 animate-pulse-audio" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            ANC Audio Pro
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Advanced hybrid ANC technology with AI-powered voice separation. 
            Control every sound in your environment with precision.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <SignUpButton mode="modal">
              <Button size="lg" variant="audio" className="text-lg px-8 py-3">
                {EMOJIS.MICROPHONE} Start Free Trial
              </Button>
            </SignUpButton>
            
            <SignInButton mode="modal">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                {EMOJIS.SETTINGS} Sign In
              </Button>
            </SignInButton>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Mic className="w-6 h-6 text-blue-600" />
                Voice Separation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                AI-powered isolation of voice frequencies with adjustable sensitivity 
                for crystal-clear conversations.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Volume2 className="w-6 h-6 text-purple-600" />
                Multi-Stream Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Individual volume control for voice, music, ambient sounds, 
                and background noise streams.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-600" />
                Advanced ANC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Studio-grade noise cancellation with selective transparency 
                mode for situational awareness.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-orange-600" />
                Real-Time Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Live audio processing with visual feedback and instant 
                adjustments for optimal audio experience.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">{EMOJIS.MOBILE}</span>
                Cross-Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Seamless experience across mobile, tablet, and desktop 
                with cloud synchronization.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">{EMOJIS.ANALYTICS}</span>
                Usage Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed insights into your audio processing usage 
                and personalized recommendations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Audio Experience?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who&apos;ve upgraded their audio control with ANC Audio Pro.
          </p>
          <SignUpButton mode="modal">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              {EMOJIS.SUCCESS} Get Started Free
            </Button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

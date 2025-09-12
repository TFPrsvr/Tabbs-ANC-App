"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, Upload, Wand2, History } from 'lucide-react';
import { EMOJIS } from '@/constants';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);
    setLastUpdate(new Date().toLocaleTimeString());

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setLastUpdate(new Date().toLocaleTimeString());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastUpdate(new Date().toLocaleTimeString());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 px-4 py-8">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isOnline ? '🌐 Back Online!' : '📡 You\'re Offline'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {isOnline 
              ? 'Your connection has been restored. You can now access all features.'
              : 'No internet connection detected. Some features may be limited.'
            }
          </p>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  ✅ Connection Restored
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  ❌ No Internet Connection
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Update:</span>
                <span className="text-sm text-gray-900 dark:text-white">{lastUpdate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Features */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {EMOJIS.SETTINGS} Available Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Local File Processing</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload and process audio files using cached resources
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  isOnline 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {isOnline ? 'Full' : 'Limited'}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Wand2 className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">AI Processing</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Basic audio separation and voice detection using cached models
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  isOnline 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {isOnline ? 'Available' : 'Unavailable'}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <History className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">File History</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View previously processed files stored locally
                  </p>
                </div>
                <div className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Available
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleRetry}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={!isOnline}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isOnline ? 'Reload App' : 'Retry Connection'}
          </Button>

          <Button
            onClick={handleGoToDashboard}
            variant="outline"
            className="flex-1"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>

        {/* Offline Tips */}
        {!isOnline && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="pt-4">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                💡 Working Offline Tips
              </h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Files uploaded before going offline can still be processed</li>
                <li>• Basic audio features work with cached resources</li>
                <li>• Your work will sync when connection is restored</li>
                <li>• Check your internet connection and try again</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Technical Info */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>ANC Audio Pro • Offline Mode</p>
          <p>Service Worker Active • Progressive Web App</p>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Volume2,
  AlertTriangle,
  CheckCircle,
  Settings,
  Clock,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  settings: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    push: boolean;
  };
}

export function NotificationsSettings() {
  const [globalNotifications, setGlobalNotifications] = useState(true);
  const [quietHours, setQuietHours] = useState({
    enabled: true,
    start: '22:00',
    end: '08:00'
  });
  const [notificationFrequency, setNotificationFrequency] = useState('immediate');

  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'processing',
      title: 'Audio Processing',
      description: 'File processing completion, analysis results, and AI insights',
      icon: Volume2,
      color: 'text-blue-600',
      settings: {
        email: true,
        sms: false,
        inApp: true,
        push: true
      }
    },
    {
      id: 'security',
      title: 'Security & Account',
      description: 'Login alerts, password changes, and security warnings',
      icon: Shield,
      color: 'text-red-600',
      settings: {
        email: true,
        sms: true,
        inApp: true,
        push: true
      }
    },
    {
      id: 'updates',
      title: 'Product Updates',
      description: 'New features, AI model improvements, and app updates',
      icon: Zap,
      color: 'text-purple-600',
      settings: {
        email: true,
        sms: false,
        inApp: true,
        push: false
      }
    },
    {
      id: 'usage',
      title: 'Usage & Analytics',
      description: 'Monthly reports, usage limits, and performance insights',
      icon: TrendingUp,
      color: 'text-green-600',
      settings: {
        email: true,
        sms: false,
        inApp: false,
        push: false
      }
    },
    {
      id: 'subscription',
      title: 'Billing & Subscription',
      description: 'Payment confirmations, plan changes, and renewal reminders',
      icon: CheckCircle,
      color: 'text-orange-600',
      settings: {
        email: true,
        sms: true,
        inApp: true,
        push: false
      }
    },
    {
      id: 'alerts',
      title: 'System Alerts',
      description: 'Error notifications, service disruptions, and maintenance',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      settings: {
        email: true,
        sms: false,
        inApp: true,
        push: true
      }
    }
  ]);

  const updateCategorySetting = (categoryId: string, type: keyof NotificationCategory['settings'], value: boolean) => {
    setCategories(prev => prev.map(category =>
      category.id === categoryId
        ? {
            ...category,
            settings: {
              ...category.settings,
              [type]: value
            }
          }
        : category
    ));
  };

  const getActiveChannelsCount = (settings: NotificationCategory['settings']) => {
    return Object.values(settings).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            🔔 Global Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Enable All Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master switch to enable or disable all notification types
              </p>
            </div>
            <Switch
              checked={globalNotifications}
              onCheckedChange={setGlobalNotifications}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Notification Frequency</Label>
              <Select
                value={notificationFrequency}
                onValueChange={setNotificationFrequency}
                disabled={!globalNotifications}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="batched">Batched (Every 15 mins)</SelectItem>
                  <SelectItem value="hourly">Hourly Summary</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Quiet Hours</Label>
                <Switch
                  checked={quietHours.enabled}
                  onCheckedChange={(checked) =>
                    setQuietHours(prev => ({ ...prev, enabled: checked }))
                  }
                  disabled={!globalNotifications}
                />
              </div>
              {quietHours.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">From</Label>
                    <Select
                      value={quietHours.start}
                      onValueChange={(value) =>
                        setQuietHours(prev => ({ ...prev, start: value }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Select
                      value={quietHours.end}
                      onValueChange={(value) =>
                        setQuietHours(prev => ({ ...prev, end: value }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            📋 Notification Categories
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure notification preferences for different types of events
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            const activeChannels = getActiveChannelsCount(category.settings);

            return (
              <div key={category.id}>
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800`}>
                        <Icon className={`w-5 h-5 ${category.color}`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{category.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {activeChannels} active
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notification Channels */}
                  <div className="ml-14 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Email</span>
                      </div>
                      <Switch
                        checked={category.settings.email}
                        onCheckedChange={(checked) =>
                          updateCategorySetting(category.id, 'email', checked)
                        }
                        disabled={!globalNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <span className="text-sm">SMS</span>
                      </div>
                      <Switch
                        checked={category.settings.sms}
                        onCheckedChange={(checked) =>
                          updateCategorySetting(category.id, 'sms', checked)
                        }
                        disabled={!globalNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">In-App</span>
                      </div>
                      <Switch
                        checked={category.settings.inApp}
                        onCheckedChange={(checked) =>
                          updateCategorySetting(category.id, 'inApp', checked)
                        }
                        disabled={!globalNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">Push</span>
                      </div>
                      <Switch
                        checked={category.settings.push}
                        onCheckedChange={(checked) =>
                          updateCategorySetting(category.id, 'push', checked)
                        }
                        disabled={!globalNotifications}
                      />
                    </div>
                  </div>
                </div>

                {index < categories.length - 1 && <Separator className="mt-6" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notification Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            🔍 Notification Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <div className="flex items-start gap-3">
                <Volume2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-900 dark:text-blue-100">
                    🎵 Audio Processing Complete
                  </h5>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Your file "song.mp3" has been processed successfully with AI voice separation.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    2 minutes ago • Email, In-App, Push
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-red-900 dark:text-red-100">
                    🔒 New Login Detected
                  </h5>
                  <p className="text-sm text-red-700 dark:text-red-200">
                    Someone signed in to your account from Chrome on Windows.
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    5 minutes ago • Email, SMS, In-App, Push
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Test Notifications</Button>
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}
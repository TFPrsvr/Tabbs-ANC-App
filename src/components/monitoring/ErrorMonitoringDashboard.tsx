"use client";

import React, { useState, useEffect } from 'react';
import { useErrorMonitoring } from '@/lib/monitoring/error-monitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  Activity,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface ErrorStatistics {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  recent: any[];
  unresolved: number;
}

interface SecurityStatistics {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  recent: any[];
  blocked: number;
}

export function ErrorMonitoringDashboard() {
  const {
    getStatistics,
    getSecurityStatistics,
    resolveError,
    exportData,
    onError,
    onSecurityEvent
  } = useErrorMonitoring();

  const [errorStats, setErrorStats] = useState<ErrorStatistics>({
    total: 0,
    bySeverity: {},
    byType: {},
    recent: [],
    unresolved: 0
  });

  const [securityStats, setSecurityStats] = useState<SecurityStatistics>({
    total: 0,
    bySeverity: {},
    byType: {},
    recent: [],
    blocked: 0
  });

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setErrorStats(getStatistics());
      setSecurityStats(getSecurityStatistics());
    };

    // Initial load
    updateStats();

    // Subscribe to real-time updates
    const unsubscribeError = onError(() => updateStats());
    const unsubscribeSecurity = onSecurityEvent(() => updateStats());

    // Refresh every 30 seconds
    const interval = setInterval(updateStats, 30000);

    return () => {
      unsubscribeError();
      unsubscribeSecurity();
      clearInterval(interval);
    };
  }, [getStatistics, getSecurityStatistics, onError, onSecurityEvent]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-monitoring-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Error Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of application errors and security events
          </p>
        </div>
        <Button onClick={handleExportData} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Data'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {errorStats.unresolved} unresolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {securityStats.blocked} blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(errorStats.bySeverity.critical || 0) + (securityStats.bySeverity.critical || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {errorStats.bySeverity.critical || securityStats.bySeverity.critical ? 'Poor' : 'Good'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall system status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Errors by Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Errors by Severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`} />
                      <span className="text-sm capitalize">{severity}</span>
                    </div>
                    <Badge variant={getSeverityVariant(severity)}>{count}</Badge>
                  </div>
                ))}
                {Object.keys(errorStats.bySeverity).length === 0 && (
                  <p className="text-sm text-muted-foreground">No errors recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Errors by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Errors by Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(errorStats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
                {Object.keys(errorStats.byType).length === 0 && (
                  <p className="text-sm text-muted-foreground">No errors recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Security Events by Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Security Events by Severity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(securityStats.bySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`} />
                      <span className="text-sm capitalize">{severity}</span>
                    </div>
                    <Badge variant={getSeverityVariant(severity)}>{count}</Badge>
                  </div>
                ))}
                {Object.keys(securityStats.bySeverity).length === 0 && (
                  <p className="text-sm text-muted-foreground">No security events recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Security Events by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Security Events by Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(securityStats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
                {Object.keys(securityStats.byType).length === 0 && (
                  <p className="text-sm text-muted-foreground">No security events recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {errorStats.recent.length > 0 ? (
                  errorStats.recent.map((error) => (
                    <div key={error.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityVariant(error.severity)} className="text-xs">
                            {error.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {error.type}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{error.message}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTimeAgo(error.timestamp)}
                        </p>
                      </div>
                      {!error.resolved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveError(error.id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent errors</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Security Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Security Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {securityStats.recent.length > 0 ? (
                  securityStats.recent.map((event) => (
                    <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityVariant(event.severity)} className="text-xs">
                            {event.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {event.type.replace('_', ' ')}
                          </Badge>
                          {event.blocked && (
                            <Badge variant="destructive" className="text-xs">
                              Blocked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{event.source}</p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTimeAgo(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent security events</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
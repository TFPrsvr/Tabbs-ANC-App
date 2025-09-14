"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResourceManager } from '@/hooks/use-resource-manager';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  Settings
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  color: 'green' | 'yellow' | 'red' | 'blue';
  trend?: 'up' | 'down' | 'stable';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, icon: Icon, color, trend }) => {
  const colorClasses = {
    green: 'border-green-500 bg-green-50',
    yellow: 'border-yellow-500 bg-yellow-50',
    red: 'border-red-500 bg-red-50',
    blue: 'border-blue-500 bg-blue-50'
  };

  const textColorClasses = {
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
    blue: 'text-blue-700'
  };

  const progressColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500'
  };

  return (
    <Card className={`border-2 ${colorClasses[color]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${textColorClasses[color]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value.toFixed(1)}{unit}
        </div>
        <div className="mt-2">
          <Progress
            value={Math.min(100, value)}
            className="h-2"
            style={{
              background: `linear-gradient(to right, ${color === 'green' ? '#22c55e' :
                color === 'yellow' ? '#eab308' :
                color === 'red' ? '#ef4444' : '#3b82f6'} 0%,
                ${color === 'green' ? '#16a34a' :
                color === 'yellow' ? '#ca8a04' :
                color === 'red' ? '#dc2626' : '#2563eb'} 100%)`
            }}
          />
        </div>
        {trend && (
          <div className={`mt-1 text-xs ${textColorClasses[color]}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} Trending {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface TaskItemProps {
  task: {
    id: string;
    name: string;
    type: string;
    progress: number;
    status: string;
    estimatedDuration?: number;
    startTime?: Date;
  };
  onCancel?: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onCancel }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      case 'queued': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getElapsedTime = () => {
    if (!task.startTime) return null;
    const elapsed = (Date.now() - task.startTime.getTime()) / 1000;
    return `${Math.floor(elapsed)}s`;
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
          <span className="font-medium text-sm">{task.name}</span>
          <Badge variant="outline" className="text-xs">
            {task.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Progress: {task.progress.toFixed(1)}%</span>
          {getElapsedTime() && (
            <>
              <span>•</span>
              <span>Elapsed: {getElapsedTime()}</span>
            </>
          )}
        </div>
        <Progress value={task.progress} className="h-1 mt-2" />
      </div>
      {onCancel && task.status === 'running' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCancel(task.id)}
          className="ml-3"
        >
          Cancel
        </Button>
      )}
    </div>
  );
};

export const ResourceMonitor: React.FC = () => {
  const {
    systemResources,
    currentProfile,
    activeTasks,
    queuedTasks,
    metrics,
    isConnected,
    alerts,
    submitTask,
    cancelTask,
    switchProfile,
    clearAlerts,
    getProfiles,
    getHealthScore,
    getRecommendations,
    isHealthy,
    isOverloaded,
    hasHighLatency,
    needsOptimization
  } = useResourceManager();

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setSelectedProfile(currentProfile.id);
    }
  }, [currentProfile]);

  const handleProfileChange = async (profileId: string) => {
    try {
      await switchProfile(profileId);
      setSelectedProfile(profileId);
    } catch (error) {
      console.error('Failed to switch profile:', error);
    }
  };

  const handleTestTask = async () => {
    try {
      await submitTask({
        name: 'Performance Test',
        type: 'audio-render',
        priority: 7,
        estimatedDuration: 3000,
        requiredResources: {
          cpu: 30,
          memory: 256
        }
      });
    } catch (error) {
      console.error('Failed to submit test task:', error);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <div className="text-red-600 font-medium">Resource Manager Disconnected</div>
          <div className="text-sm text-gray-600 mt-1">
            Unable to connect to the performance monitoring system
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = getHealthScore();
  const recommendations = getRecommendations();

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                System Health Overview
              </CardTitle>
              <CardDescription>
                Real-time performance monitoring and optimization
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {healthScore.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Health Score</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                isHealthy ? 'bg-green-500' : isOverloaded ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {metrics && (
              <>
                <MetricCard
                  title="CPU Usage"
                  value={metrics.cpu}
                  unit="%"
                  icon={Cpu}
                  color={metrics.cpu > 80 ? 'red' : metrics.cpu > 60 ? 'yellow' : 'green'}
                />
                <MetricCard
                  title="Memory Usage"
                  value={metrics.memory}
                  unit="%"
                  icon={MemoryStick}
                  color={metrics.memory > 85 ? 'red' : metrics.memory > 70 ? 'yellow' : 'green'}
                />
                <MetricCard
                  title="Audio Latency"
                  value={metrics.averageLatency}
                  unit="ms"
                  icon={Activity}
                  color={hasHighLatency ? 'red' : metrics.averageLatency > 5 ? 'yellow' : 'green'}
                />
                <MetricCard
                  title="Cache Hit Rate"
                  value={metrics.cacheHitRate * 100}
                  unit="%"
                  icon={HardDrive}
                  color={metrics.cacheHitRate > 0.8 ? 'green' : metrics.cacheHitRate > 0.6 ? 'yellow' : 'red'}
                />
              </>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={isHealthy ? 'default' : 'destructive'}>
              {isHealthy ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
              {isHealthy ? 'Healthy' : 'Needs Attention'}
            </Badge>
            {isOverloaded && (
              <Badge variant="destructive">
                <Zap className="w-3 h-3 mr-1" />
                System Overloaded
              </Badge>
            )}
            {hasHighLatency && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                High Latency
              </Badge>
            )}
            {needsOptimization && (
              <Badge variant="outline">
                <Settings className="w-3 h-3 mr-1" />
                Optimization Available
              </Badge>
            )}
          </div>

          {/* Performance Profile Selection */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Performance Profile:</label>
            <select
              value={selectedProfile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {getProfiles().map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} - {profile.description}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestTask}
              className="ml-auto"
            >
              Run Performance Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Recommendations */}
      {(alerts.length > 0 || recommendations.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alerts & Recommendations</CardTitle>
              {alerts.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAlerts}>
                  Clear Alerts
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map(alert => (
              <Alert key={alert.id} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            ))}

            {recommendations.map((recommendation, index) => (
              <Alert key={index}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Monitoring */}
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
          <TabsTrigger value="system">System Details</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Running Tasks ({activeTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeTasks.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    No active tasks
                  </div>
                ) : (
                  activeTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onCancel={cancelTask}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queued Tasks ({queuedTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {queuedTasks.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    No queued tasks
                  </div>
                ) : (
                  queuedTasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {systemResources && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hardware Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">CPU Cores</div>
                      <div className="text-gray-600">{systemResources.cpu.cores}</div>
                    </div>
                    <div>
                      <div className="font-medium">CPU Frequency</div>
                      <div className="text-gray-600">{systemResources.cpu.frequency} MHz</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Memory</div>
                      <div className="text-gray-600">{(systemResources.memory.total / 1024).toFixed(1)} GB</div>
                    </div>
                    <div>
                      <div className="font-medium">Available Memory</div>
                      <div className="text-gray-600">{(systemResources.memory.available / 1024).toFixed(1)} GB</div>
                    </div>
                    {systemResources.gpu && (
                      <>
                        <div>
                          <div className="font-medium">GPU</div>
                          <div className="text-gray-600">{systemResources.gpu.name}</div>
                        </div>
                        <div>
                          <div className="font-medium">GPU Memory</div>
                          <div className="text-gray-600">{(systemResources.gpu.memory / 1024).toFixed(1)} GB</div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audio System</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Sample Rate</div>
                      <div className="text-gray-600">{systemResources.audio.currentSampleRate} Hz</div>
                    </div>
                    <div>
                      <div className="font-medium">Buffer Size</div>
                      <div className="text-gray-600">{systemResources.audio.bufferSize} samples</div>
                    </div>
                    <div>
                      <div className="font-medium">Input Devices</div>
                      <div className="text-gray-600">{systemResources.audio.inputDevices.length}</div>
                    </div>
                    <div>
                      <div className="font-medium">Output Devices</div>
                      <div className="text-gray-600">{systemResources.audio.outputDevices.length}</div>
                    </div>
                    <div>
                      <div className="font-medium">Audio Dropouts</div>
                      <div className="text-gray-600">{systemResources.audio.dropouts}</div>
                    </div>
                    <div>
                      <div className="font-medium">Network Latency</div>
                      <div className="text-gray-600">{systemResources.network.latency} ms</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Profiles</CardTitle>
              <CardDescription>
                Customize performance settings for different use cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getProfiles().map(profile => (
                  <div
                    key={profile.id}
                    className={`p-4 border rounded-lg ${
                      profile.isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-gray-600">{profile.description}</div>
                      </div>
                      {profile.isActive && <Badge>Active</Badge>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>Buffer: {profile.settings.audioBufferSize}</div>
                      <div>Priority: {profile.settings.processingPriority}</div>
                      <div>Memory: {(profile.settings.memoryLimit / 1024).toFixed(1)}GB</div>
                      <div>CPU: {profile.settings.cpuLimit}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
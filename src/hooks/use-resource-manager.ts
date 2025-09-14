"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { resourceManager, type ProcessingTask, type SystemResources, type PerformanceProfile } from '@/lib/performance/resource-manager';

interface ResourceMetrics {
  cpu: number;
  memory: number;
  gpu?: number;
  activeTasks: number;
  queuedTasks: number;
  averageLatency: number;
  cacheHitRate: number;
  networkLatency: number;
}

interface TaskSubmissionOptions {
  name: string;
  type: ProcessingTask['type'];
  priority?: number;
  estimatedDuration?: number;
  requiredResources?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    gpu?: number;
  };
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export function useResourceManager() {
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [currentProfile, setCurrentProfile] = useState<PerformanceProfile | null>(null);
  const [activeTasks, setActiveTasks] = useState<ProcessingTask[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<ProcessingTask[]>([]);
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  const alertsRef = useRef<any[]>([]);
  const metricsHistoryRef = useRef<ResourceMetrics[]>([]);

  // Initialize connection to resource manager
  useEffect(() => {
    const initializeResourceManager = () => {
      try {
        setSystemResources(resourceManager.getSystemResources());
        setCurrentProfile(resourceManager.getCurrentProfile() || null);
        setActiveTasks(resourceManager.getRunningTasks());
        setQueuedTasks(resourceManager.getProcessingQueue());
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to initialize resource manager:', error);
        setIsConnected(false);
      }
    };

    initializeResourceManager();

    // Listen for resource updates
    const handleResourcesUpdated = (resources: SystemResources) => {
      setSystemResources(resources);
      updateMetrics(resources);
    };

    const handleProfileSwitched = ({ newProfile }: { newProfile: PerformanceProfile }) => {
      setCurrentProfile(newProfile);
    };

    const handleTaskStarted = (task: ProcessingTask) => {
      setActiveTasks(prev => [...prev, task]);
    };

    const handleTaskCompleted = (task: ProcessingTask) => {
      setActiveTasks(prev => prev.filter(t => t.id !== task.id));
    };

    const handleTaskQueued = (task: ProcessingTask) => {
      setQueuedTasks(prev => [...prev, task]);
    };

    const handleTaskCancelled = (task: ProcessingTask) => {
      setActiveTasks(prev => prev.filter(t => t.id !== task.id));
      setQueuedTasks(prev => prev.filter(t => t.id !== task.id));
    };

    const handlePerformanceAlert = (alert: any) => {
      const newAlert = {
        id: `alert_${Date.now()}`,
        timestamp: new Date(),
        ...alert
      };

      alertsRef.current = [newAlert, ...alertsRef.current].slice(0, 10); // Keep last 10 alerts
      setAlerts([...alertsRef.current]);
    };

    // Add event listeners
    resourceManager.on('resourcesUpdated', handleResourcesUpdated);
    resourceManager.on('profileSwitched', handleProfileSwitched);
    resourceManager.on('taskStarted', handleTaskStarted);
    resourceManager.on('taskCompleted', handleTaskCompleted);
    resourceManager.on('taskQueued', handleTaskQueued);
    resourceManager.on('taskCancelled', handleTaskCancelled);
    resourceManager.on('performanceAlert', handlePerformanceAlert);

    return () => {
      resourceManager.off('resourcesUpdated', handleResourcesUpdated);
      resourceManager.off('profileSwitched', handleProfileSwitched);
      resourceManager.off('taskStarted', handleTaskStarted);
      resourceManager.off('taskCompleted', handleTaskCompleted);
      resourceManager.off('taskQueued', handleTaskQueued);
      resourceManager.off('taskCancelled', handleTaskCancelled);
      resourceManager.off('performanceAlert', handlePerformanceAlert);
    };
  }, []);

  // Update metrics calculation
  const updateMetrics = useCallback((resources: SystemResources) => {
    const newMetrics: ResourceMetrics = {
      cpu: resources.cpu.usage,
      memory: (resources.memory.used / resources.memory.total) * 100,
      gpu: resources.gpu ? resources.gpu.usage : undefined,
      activeTasks: resourceManager.getRunningTasks().length,
      queuedTasks: resourceManager.getProcessingQueue().length,
      averageLatency: resources.audio.latency,
      cacheHitRate: resourceManager.getCacheManagers().reduce((avg, cache) =>
        avg + cache.hitRate, 0) / Math.max(1, resourceManager.getCacheManagers().length),
      networkLatency: resources.network.latency
    };

    setMetrics(newMetrics);

    // Keep metrics history for trends
    metricsHistoryRef.current = [newMetrics, ...metricsHistoryRef.current].slice(0, 60); // Last minute
  }, []);

  // Submit a processing task
  const submitTask = useCallback(async (options: TaskSubmissionOptions): Promise<string> => {
    try {
      const taskId = await resourceManager.addProcessingTask({
        name: options.name,
        type: options.type,
        priority: options.priority || 5,
        estimatedDuration: options.estimatedDuration || 5000,
        requiredResources: {
          cpu: options.requiredResources?.cpu || 25,
          memory: options.requiredResources?.memory || 256,
          disk: options.requiredResources?.disk,
          gpu: options.requiredResources?.gpu
        },
        dependencies: [],
        metadata: {
          submittedAt: new Date().toISOString(),
          source: 'react-hook'
        }
      });

      // Set up progress tracking if callback provided
      if (options.onProgress) {
        const handleProgress = ({ taskId: id, progress }: { taskId: string; progress: number }) => {
          if (id === taskId) {
            options.onProgress!(progress);
          }
        };

        resourceManager.on('taskProgress', handleProgress);

        // Clean up listener when task completes
        const cleanup = () => {
          resourceManager.off('taskProgress', handleProgress);
        };

        const handleTaskComplete = (task: ProcessingTask) => {
          if (task.id === taskId) {
            cleanup();
            if (task.status === 'completed') {
              options.onComplete?.(task);
            } else if (task.status === 'failed') {
              options.onError?.(new Error(task.error || 'Task failed'));
            }
          }
        };

        resourceManager.once('taskCompleted', handleTaskComplete);
        resourceManager.once('taskCancelled', cleanup);
      }

      return taskId;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }, []);

  // Cancel a task
  const cancelTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      await resourceManager.cancelTask(taskId);
    } catch (error) {
      console.error('Failed to cancel task:', error);
      throw error;
    }
  }, []);

  // Switch performance profile
  const switchProfile = useCallback(async (profileId: string): Promise<void> => {
    try {
      await resourceManager.switchProfile(profileId);
    } catch (error) {
      console.error('Failed to switch profile:', error);
      throw error;
    }
  }, []);

  // Get available profiles
  const getProfiles = useCallback((): PerformanceProfile[] => {
    return resourceManager.getAllProfiles();
  }, []);

  // Clear performance alerts
  const clearAlerts = useCallback(() => {
    alertsRef.current = [];
    setAlerts([]);
  }, []);

  // Get metrics history for charts
  const getMetricsHistory = useCallback((): ResourceMetrics[] => {
    return [...metricsHistoryRef.current];
  }, []);

  // Get system health score (0-100)
  const getHealthScore = useCallback((): number => {
    if (!metrics || !systemResources) return 0;

    let score = 100;

    // CPU penalty
    if (metrics.cpu > 90) score -= 30;
    else if (metrics.cpu > 70) score -= 15;
    else if (metrics.cpu > 50) score -= 5;

    // Memory penalty
    if (metrics.memory > 95) score -= 25;
    else if (metrics.memory > 80) score -= 10;
    else if (metrics.memory > 60) score -= 3;

    // Latency penalty
    if (metrics.averageLatency > 20) score -= 20;
    else if (metrics.averageLatency > 10) score -= 8;
    else if (metrics.averageLatency > 5) score -= 3;

    // Cache hit rate bonus/penalty
    if (metrics.cacheHitRate > 0.9) score += 5;
    else if (metrics.cacheHitRate < 0.7) score -= 10;

    // Queue backlog penalty
    if (metrics.queuedTasks > 10) score -= 15;
    else if (metrics.queuedTasks > 5) score -= 5;

    // GPU utilization (if available)
    if (metrics.gpu !== undefined) {
      if (metrics.gpu > 95) score -= 10;
      else if (metrics.gpu > 80) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }, [metrics, systemResources]);

  // Get performance recommendations
  const getRecommendations = useCallback((): string[] => {
    if (!metrics || !systemResources) return [];

    const recommendations: string[] = [];

    if (metrics.cpu > 80) {
      recommendations.push('High CPU usage detected. Consider switching to a lower-performance profile or reducing concurrent tasks.');
    }

    if (metrics.memory > 85) {
      recommendations.push('High memory usage detected. Clear caches or reduce buffer sizes.');
    }

    if (metrics.averageLatency > 15) {
      recommendations.push('High audio latency detected. Try increasing buffer size or switching to Low Latency profile.');
    }

    if (metrics.cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate. Consider increasing cache sizes or optimizing data access patterns.');
    }

    if (metrics.queuedTasks > 8) {
      recommendations.push('Large task queue detected. Consider optimizing task priorities or adding more processing capacity.');
    }

    if (metrics.networkLatency > 100) {
      recommendations.push('High network latency detected. Check internet connection or use offline processing modes.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal. No immediate action required.');
    }

    return recommendations;
  }, [metrics, systemResources]);

  return {
    // State
    systemResources,
    currentProfile,
    activeTasks,
    queuedTasks,
    metrics,
    isConnected,
    alerts,

    // Actions
    submitTask,
    cancelTask,
    switchProfile,
    clearAlerts,

    // Getters
    getProfiles,
    getMetricsHistory,
    getHealthScore,
    getRecommendations,

    // Derived state
    isHealthy: getHealthScore() > 70,
    isOverloaded: metrics ? metrics.cpu > 90 || metrics.memory > 95 : false,
    hasHighLatency: metrics ? metrics.averageLatency > 10 : false,
    needsOptimization: getRecommendations().length > 1,
  };
}
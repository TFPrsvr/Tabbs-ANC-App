import type { NextApiRequest, NextApiResponse } from 'next'

interface SystemMetrics {
  timestamp: string
  system: {
    uptime: number
    loadAverage: number[]
    memory: {
      used: number
      free: number
      total: number
      heapUsed: number
      heapTotal: number
      external: number
      arrayBuffers: number
    }
    cpu: {
      usage: number
      user: number
      system: number
    }
    process: {
      pid: number
      ppid: number
      version: string
      platform: string
      arch: string
    }
  }
  performance: {
    eventLoopDelay: number
    eventLoopUtilization: number
    gcStats?: {
      totalHeapSize: number
      totalHeapSizeExecutable: number
      totalPhysicalSize: number
      totalAvailableSize: number
      usedHeapSize: number
      heapSizeLimit: number
    }
  }
  http: {
    activeConnections: number
    totalRequests: number
    requestsPerSecond: number
    averageResponseTime: number
  }
  audio: {
    activeProcessors: number
    bufferUtilization: number
    sampleRate: number
    bufferSize: number
    latency: number
  }
  ai: {
    activeAnalyses: number
    queuedAnalyses: number
    averageAnalysisTime: number
    modelLoadTime: number
  }
  database: {
    activeConnections: number
    queryCount: number
    averageQueryTime: number
    cacheHitRatio: number
  }
}

// Global counters for metrics tracking
let requestCounter = 0
let requestTimes: number[] = []
let lastRequestTime = Date.now()

// Performance monitoring
const performanceObserver = typeof process !== 'undefined' && process.hrtime ? {
  startTime: process.hrtime(),
  getElapsed: () => {
    const elapsed = process.hrtime(performanceObserver?.startTime)
    return elapsed[0] * 1000 + elapsed[1] * 1e-6 // Convert to milliseconds
  }
} : null

function getMemoryMetrics() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage()
    return {
      used: memory.rss,
      free: 0, // Not directly available in Node.js
      total: 0, // Not directly available in Node.js
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers || 0
    }
  }

  return {
    used: 0,
    free: 0,
    total: 0,
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    arrayBuffers: 0
  }
}

function getCpuMetrics() {
  if (typeof process !== 'undefined' && process.cpuUsage) {
    const cpuUsage = process.cpuUsage()
    const totalUsage = cpuUsage.user + cpuUsage.system

    return {
      usage: totalUsage / 1000000, // Convert microseconds to seconds
      user: cpuUsage.user / 1000000,
      system: cpuUsage.system / 1000000
    }
  }

  return {
    usage: 0,
    user: 0,
    system: 0
  }
}

function getProcessMetrics() {
  if (typeof process !== 'undefined') {
    return {
      pid: process.pid,
      ppid: process.ppid || 0,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  }

  return {
    pid: 0,
    ppid: 0,
    version: 'unknown',
    platform: 'unknown',
    arch: 'unknown'
  }
}

function getPerformanceMetrics() {
  // Simulate event loop delay (in a real implementation, you'd use perf_hooks)
  const eventLoopDelay = Math.random() * 10 // ms
  const eventLoopUtilization = Math.random() * 0.1 // 0-1

  return {
    eventLoopDelay,
    eventLoopUtilization
  }
}

function getHttpMetrics() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  // Calculate requests per second
  const requestsPerSecond = timeSinceLastRequest > 0 ? 1000 / timeSinceLastRequest : 0

  // Calculate average response time from recent requests
  const recentTimes = requestTimes.slice(-100) // Last 100 requests
  const averageResponseTime = recentTimes.length > 0
    ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length
    : 0

  return {
    activeConnections: 1, // Simplified for demo
    totalRequests: requestCounter,
    requestsPerSecond,
    averageResponseTime
  }
}

function getAudioMetrics() {
  // In a real implementation, these would be tracked by the audio engine
  return {
    activeProcessors: Math.floor(Math.random() * 5),
    bufferUtilization: Math.random() * 100,
    sampleRate: 48000,
    bufferSize: 4096,
    latency: Math.random() * 20 + 5 // 5-25ms
  }
}

function getAiMetrics() {
  // In a real implementation, these would be tracked by the AI system
  return {
    activeAnalyses: Math.floor(Math.random() * 3),
    queuedAnalyses: Math.floor(Math.random() * 10),
    averageAnalysisTime: Math.random() * 5000 + 1000, // 1-6 seconds
    modelLoadTime: Math.random() * 2000 + 500 // 0.5-2.5 seconds
  }
}

function getDatabaseMetrics() {
  // In a real implementation, these would be tracked by the database connection pool
  return {
    activeConnections: Math.floor(Math.random() * 10) + 1,
    queryCount: Math.floor(Math.random() * 1000),
    averageQueryTime: Math.random() * 100 + 10, // 10-110ms
    cacheHitRatio: Math.random() * 0.3 + 0.7 // 70-100%
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SystemMetrics | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    // Track request metrics
    const requestStart = Date.now()
    requestCounter++

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: typeof process !== 'undefined' ? process.uptime() : 0,
        loadAverage: typeof process !== 'undefined' && (process as any).loadavg ? (process as any).loadavg() : [0, 0, 0],
        memory: getMemoryMetrics(),
        cpu: getCpuMetrics(),
        process: getProcessMetrics()
      },
      performance: getPerformanceMetrics(),
      http: getHttpMetrics(),
      audio: getAudioMetrics(),
      ai: getAiMetrics(),
      database: getDatabaseMetrics()
    }

    // Record request time
    const requestTime = Date.now() - requestStart
    requestTimes.push(requestTime)
    if (requestTimes.length > 1000) {
      requestTimes = requestTimes.slice(-100) // Keep only last 100
    }
    lastRequestTime = Date.now()

    // Set headers for Prometheus scraping
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    res.status(200).json(metrics)

  } catch (error) {
    console.error('Error generating metrics:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error generating metrics'
    })
  }
}
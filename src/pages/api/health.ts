import type { NextApiRequest, NextApiResponse } from 'next'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    [key: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded'
      responseTime?: number
      lastChecked: string
      details?: string
    }
  }
  memory: {
    used: number
    free: number
    total: number
    heapUsed: number
    heapTotal: number
  }
  performance: {
    loadAverage: number[]
    cpuUsage: number
  }
}

async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded', responseTime: number, details?: string }> {
  const startTime = Date.now()

  try {
    // Simple database connectivity check
    // In a real implementation, you would check your actual database
    // For now, we'll simulate a health check
    await new Promise(resolve => setTimeout(resolve, 10)) // Simulate DB query

    const responseTime = Date.now() - startTime

    if (responseTime > 1000) {
      return {
        status: 'degraded',
        responseTime,
        details: 'Database response time is high'
      }
    }

    return {
      status: 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

async function checkAudioServiceHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded', responseTime: number, details?: string }> {
  const startTime = Date.now()

  try {
    // Check if audio processing services are available
    // This would typically involve checking Web Audio API availability or external services
    const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : null

    if (audioContext) {
      await audioContext.close()
    }

    const responseTime = Date.now() - startTime

    return {
      status: 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'Audio service unavailable'
    }
  }
}

async function checkExternalServicesHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded', responseTime: number, details?: string }> {
  const startTime = Date.now()

  try {
    // Check external dependencies (AI services, file storage, etc.)
    // For now, we'll simulate these checks
    await new Promise(resolve => setTimeout(resolve, 50))

    const responseTime = Date.now() - startTime

    return {
      status: 'healthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'External services unavailable'
    }
  }
}

function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage()
    return {
      used: memory.rss,
      free: 0, // Not available in Node.js
      total: 0, // Not available in Node.js
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal
    }
  }

  return {
    used: 0,
    free: 0,
    total: 0,
    heapUsed: 0,
    heapTotal: 0
  }
}

function getPerformanceMetrics() {
  if (typeof process !== 'undefined') {
    return {
      loadAverage: (process as any).loadavg ? (process as any).loadavg() : [0, 0, 0],
      cpuUsage: process.cpuUsage ? process.cpuUsage().user / 1000000 : 0 // Convert to seconds
    }
  }

  return {
    loadAverage: [0, 0, 0],
    cpuUsage: 0
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      environment: 'unknown',
      services: {},
      memory: getMemoryUsage(),
      performance: getPerformanceMetrics()
    })
    return
  }

  try {
    const startTime = Date.now()

    // Run health checks in parallel
    const [dbHealth, audioHealth, externalHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkAudioServiceHealth(),
      checkExternalServicesHealth()
    ])

    const services = {
      database: {
        ...dbHealth,
        lastChecked: new Date().toISOString()
      },
      audio: {
        ...audioHealth,
        lastChecked: new Date().toISOString()
      },
      external: {
        ...externalHealth,
        lastChecked: new Date().toISOString()
      }
    }

    // Determine overall health status
    const allHealthy = Object.values(services).every(service => service.status === 'healthy')
    const anyUnhealthy = Object.values(services).some(service => service.status === 'unhealthy')

    const overallStatus: 'healthy' | 'unhealthy' | 'degraded' =
      anyUnhealthy ? 'unhealthy' :
      allHealthy ? 'healthy' : 'degraded'

    const healthStatus: HealthStatus = {
      status: overallStatus as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: typeof process !== 'undefined' ? process.uptime() : 0,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      memory: getMemoryUsage(),
      performance: getPerformanceMetrics()
    }

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503

    // Set cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Content-Type', 'application/json')

    res.status(statusCode).json(healthStatus)

  } catch (error) {
    const errorHealthStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: typeof process !== 'undefined' ? process.uptime() : 0,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        system: {
          status: 'unhealthy',
          lastChecked: new Date().toISOString(),
          details: error instanceof Error ? error.message : 'Unknown system error'
        }
      },
      memory: getMemoryUsage(),
      performance: getPerformanceMetrics()
    }

    res.status(503).json(errorHealthStatus)
  }
}
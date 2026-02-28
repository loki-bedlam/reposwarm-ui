import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'
import { SystemHealth } from '@/lib/types'

export async function GET() {
  try {
    const temporalConnected = await temporalClient.checkHealth()

    const health: SystemHealth = {
      temporal: {
        connected: temporalConnected,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'investigate-task-queue'
      },
      worker: {
        connected: temporalConnected, // Simplified for now
        count: temporalConnected ? 1 : 0
      },
      api: temporalConnected ? 'healthy' : 'degraded'
    }

    return NextResponse.json(health)
  } catch (error) {
    logger.error('Error checking health:', { error: String(error) })
    return NextResponse.json(
      {
        temporal: {
          connected: false,
          namespace: 'unknown',
          taskQueue: 'unknown'
        },
        worker: {
          connected: false,
          count: 0
        },
        api: 'error' as const
      },
      { status: 500 }
    )
  }
}
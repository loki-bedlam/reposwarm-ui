import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { temporalClient } from '@/lib/temporal'

// Mock the temporal client
vi.mock('@/lib/temporal', () => ({
  temporalClient: {
    checkHealth: vi.fn()
  }
}))

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      return new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
  }
}))

describe('Health API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env.TEMPORAL_NAMESPACE = 'default'
    process.env.TEMPORAL_TASK_QUEUE = 'investigate-task-queue'
  })

  describe('GET /api/health', () => {
    it('should return healthy status when temporal is connected', async () => {
      vi.mocked(temporalClient.checkHealth).mockResolvedValue(true)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        temporal: {
          connected: true,
          namespace: 'default',
          taskQueue: 'investigate-task-queue'
        },
        worker: {
          connected: true,
          count: 1
        },
        api: 'healthy'
      })
    })

    it('should return degraded status when temporal is not connected', async () => {
      vi.mocked(temporalClient.checkHealth).mockResolvedValue(false)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        temporal: {
          connected: false,
          namespace: 'default',
          taskQueue: 'investigate-task-queue'
        },
        worker: {
          connected: false,
          count: 0
        },
        api: 'degraded'
      })
    })

    it('should return error status when health check throws', async () => {
      vi.mocked(temporalClient.checkHealth).mockRejectedValue(new Error('Connection failed'))

      // Mock console.error to prevent test output noise (logger.error writes to console.error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        temporal: {
          connected: false,
          namespace: 'unknown',
          taskQueue: 'unknown'
        },
        worker: {
          connected: false,
          count: 0
        },
        api: 'error'
      })

      // logger.error outputs JSON to console.error
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should use custom environment variables', async () => {
      process.env.TEMPORAL_NAMESPACE = 'custom-namespace'
      process.env.TEMPORAL_TASK_QUEUE = 'custom-queue'

      vi.mocked(temporalClient.checkHealth).mockResolvedValue(true)

      const response = await GET()
      const data = await response.json()

      expect(data.temporal.namespace).toBe('custom-namespace')
      expect(data.temporal.taskQueue).toBe('custom-queue')
    })

    it('should use default values when environment variables are not set', async () => {
      delete process.env.TEMPORAL_NAMESPACE
      delete process.env.TEMPORAL_TASK_QUEUE

      vi.mocked(temporalClient.checkHealth).mockResolvedValue(true)

      const response = await GET()
      const data = await response.json()

      expect(data.temporal.namespace).toBe('default')
      expect(data.temporal.taskQueue).toBe('investigate-task-queue')
    })
  })
})
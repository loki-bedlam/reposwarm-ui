import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      return new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Health API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TEMPORAL_NAMESPACE = 'default'
    process.env.TEMPORAL_TASK_QUEUE = 'investigate-task-queue'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when temporal is connected', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          temporal: { connected: true, namespace: 'default' },
          worker: { connected: true, count: 1 },
        })
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.temporal.connected).toBe(true)
      expect(data.worker.connected).toBe(true)
      expect(data.worker.count).toBe(1)
      expect(data.api).toBe('healthy')
    })

    it('should return degraded status when temporal is not connected', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          temporal: { connected: false, namespace: 'default' },
          worker: { connected: false, count: 0 },
        })
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.temporal.connected).toBe(false)
      expect(data.worker.connected).toBe(false)
      expect(data.api).toBe('degraded')
    })

    it('should return error status when health check throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.temporal.connected).toBe(false)
      expect(data.api).toBe('error')
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should use custom environment variables', async () => {
      process.env.TEMPORAL_TASK_QUEUE = 'custom-queue'

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          temporal: { connected: true, namespace: 'custom-ns' },
          worker: { connected: true, count: 1 },
        })
      })

      const response = await GET()
      const data = await response.json()

      expect(data.temporal.taskQueue).toBe('custom-queue')
    })

    it('should use default values when environment variables are not set', async () => {
      delete process.env.TEMPORAL_NAMESPACE
      delete process.env.TEMPORAL_TASK_QUEUE

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          temporal: { connected: true, namespace: 'default' },
          worker: { connected: true, count: 1 },
        })
      })

      const response = await GET()
      const data = await response.json()

      expect(data.temporal.namespace).toBe('default')
      expect(data.temporal.taskQueue).toBe('investigate-task-queue')
    })

    it('should handle non-ok response from health API', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.temporal.connected).toBe(false)
      consoleErrorSpy.mockRestore()
    })
  })
})

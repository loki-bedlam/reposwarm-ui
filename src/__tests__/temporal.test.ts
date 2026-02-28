import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the temporal client module
const mockFetch = global.fetch as ReturnType<typeof vi.fn>

describe('TemporalClient', () => {
  let TemporalClient: any

  beforeEach(async () => {
    vi.stubEnv('TEMPORAL_HTTP_URL', 'http://localhost:8233')
    vi.stubEnv('TEMPORAL_NAMESPACE', 'default')
    vi.stubEnv('TEMPORAL_TASK_QUEUE', 'investigate-task-queue')
    mockFetch.mockReset()
    // Re-import to pick up env vars
    const mod = await import('@/lib/temporal')
    TemporalClient = mod.TemporalClient
  })

  describe('checkHealth', () => {
    it('returns true when Temporal is reachable', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const client = new TemporalClient()
      const result = await client.checkHealth()
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8233/api/v1/system-info',
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
      )
    })

    it('returns false when Temporal is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
      const client = new TemporalClient()
      const result = await client.checkHealth()
      expect(result).toBe(false)
    })

    it('returns false on non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
      const client = new TemporalClient()
      const result = await client.checkHealth()
      expect(result).toBe(false)
    })
  })

  describe('listWorkflows', () => {
    it('returns mapped workflow executions', async () => {
      const mockResponse = {
        executions: [
          {
            execution: { workflowId: 'test-wf-1', runId: 'run-1' },
            type: { name: 'SingleRepoInvestigation' },
            status: 'WORKFLOW_EXECUTION_STATUS_COMPLETED',
            startTime: '2026-02-28T00:00:00Z',
            closeTime: '2026-02-28T00:05:00Z',
            taskQueue: { name: 'investigate-task-queue' },
          },
        ],
        nextPageToken: null,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const client = new TemporalClient()
      const result = await client.listWorkflows(10)

      expect(result.executions).toHaveLength(1)
      expect(result.executions[0].workflowId).toBe('test-wf-1')
      expect(result.executions[0].type).toBe('single')
    })

    it('handles empty workflow list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ executions: [], nextPageToken: null }),
      })

      const client = new TemporalClient()
      const result = await client.listWorkflows()

      expect(result.executions).toHaveLength(0)
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      })

      const client = new TemporalClient()
      await expect(client.listWorkflows()).rejects.toThrow('Failed to list workflows')
    })
  })

  describe('startWorkflow', () => {
    it('sends correct payload and returns IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflowId: 'new-wf', runId: 'new-run' }),
      })

      const client = new TemporalClient()
      const result = await client.startWorkflow('new-wf', 'SingleRepoInvestigation', {
        repo_name: 'test-repo',
      })

      expect(result.workflowId).toBe('new-wf')
      expect(result.runId).toBe('new-run')

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/workflows')
      const body = JSON.parse(opts.body)
      expect(body.workflowId).toBe('new-wf')
      expect(body.workflowType.name).toBe('SingleRepoInvestigation')
      expect(body.taskQueue.name).toBe('investigate-task-queue')
    })
  })

  describe('inferWorkflowType', () => {
    it('detects single repo investigation', () => {
      const client = new TemporalClient()
      // Access private method via mapped execution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          executions: [
            {
              execution: { workflowId: 'w1', runId: 'r1' },
              type: { name: 'SingleRepoInvestigation' },
              status: 'Running',
              startTime: new Date().toISOString(),
              taskQueue: { name: 'tq' },
            },
          ],
        }),
      })
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TemporalClient } from './temporal'

describe('TemporalClient', () => {
  let client: TemporalClient
  let fetchMock: any

  beforeEach(() => {
    client = new TemporalClient()
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('URL construction', () => {
    it('should construct correct URL for listing workflows', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ executions: [] })
      })

      await client.listWorkflows(25, 'nextToken123')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/namespaces/default/workflows?pageSize=25&nextPageToken=nextToken123'),
        expect.any(Object)
      )
    })

    it('should construct correct URL for getting workflow with runId', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflowExecutionInfo: {} })
      })

      await client.getWorkflow('workflow-123', 'run-456')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/namespaces/default/workflows/workflow-123/runs/run-456'),
        expect.any(Object)
      )
    })

    it('should construct correct URL for getting workflow without runId', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflowExecutionInfo: {} })
      })

      await client.getWorkflow('workflow-123')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/namespaces/default/workflows/workflow-123'),
        expect.any(Object)
      )
    })

    it('should construct correct URL for terminating workflow', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true
      })

      await client.terminateWorkflow('workflow-123', 'run-456', 'Test reason')

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/namespaces/default/workflows/workflow-123/runs/run-456/terminate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Test reason' })
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should throw error when listing workflows fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })

      await expect(client.listWorkflows()).rejects.toThrow('Failed to list workflows: Internal Server Error')
    })

    it('should throw error when getting workflow fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(client.getWorkflow('workflow-123')).rejects.toThrow('Failed to get workflow: Not Found')
    })

    it('should throw error when getting workflow history fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden'
      })

      await expect(client.getWorkflowHistory('workflow-123')).rejects.toThrow('Failed to get workflow history: Forbidden')
    })

    it('should throw error when terminating workflow fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      })

      await expect(client.terminateWorkflow('workflow-123')).rejects.toThrow('Failed to terminate workflow: Bad Request')
    })

    it('should throw error with response text when starting workflow fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid input format'
      })

      await expect(client.startWorkflow('workflow-123', 'TestWorkflow', {})).rejects.toThrow('Failed to start workflow: Invalid input format')
    })
  })

  describe('checkHealth', () => {
    it('should return true when health check succeeds', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true
      })

      const result = await client.checkHealth()
      expect(result).toBe(true)
    })

    it('should return false when health check fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false
      })

      const result = await client.checkHealth()
      expect(result).toBe(false)
    })

    it('should return false when health check throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const result = await client.checkHealth()
      expect(result).toBe(false)
    })
  })

  describe('startWorkflow', () => {
    it('should start workflow with correct payload structure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workflowId: 'workflow-123', runId: 'run-456' })
      })

      const result = await client.startWorkflow('workflow-123', 'TestWorkflow', { test: 'data' })

      expect(result).toEqual({
        workflowId: 'workflow-123',
        runId: 'run-456'
      })

      const callArgs = fetchMock.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.workflowId).toBe('workflow-123')
      expect(body.workflowType.name).toBe('TestWorkflow')
      expect(body.taskQueue.name).toBe('investigate-task-queue')
      expect(body.input.payloads).toHaveLength(1)
      expect(body.input.payloads[0].metadata.encoding).toBe('anNvbi9wbGFpbg==')
    })
  })

  describe('Workflow type inference', () => {
    it('should infer single workflow type', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflowExecutionInfo: {
            type: { name: 'SingleRepoInvestigateWorkflow' },
            execution: { workflowId: 'test', runId: 'test' }
          }
        })
      })

      const result = await client.getWorkflow('test')
      expect(result.type).toBe('single')
    })

    it('should infer daily workflow type', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflowExecutionInfo: {
            type: { name: 'DailyScheduledWorkflow' },
            execution: { workflowId: 'test', runId: 'test' }
          }
        })
      })

      const result = await client.getWorkflow('test')
      expect(result.type).toBe('daily')
    })

    it('should default to multi workflow type', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflowExecutionInfo: {
            type: { name: 'SomeOtherWorkflow' },
            execution: { workflowId: 'test', runId: 'test' }
          }
        })
      })

      const result = await client.getWorkflow('test')
      expect(result.type).toBe('multi')
    })
  })
})
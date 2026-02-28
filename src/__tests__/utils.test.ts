import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toContain('base')
    expect(result).toContain('extra')
    expect(result).not.toContain('hidden')
  })

  it('handles undefined/null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toContain('base')
    expect(result).toContain('end')
  })
})

describe('Types', () => {
  it('WorkflowExecution has required fields', () => {
    const execution = {
      workflowId: 'test',
      runId: 'run-1',
      type: 'single' as const,
      status: 'Running',
      startTime: new Date().toISOString(),
      taskQueueName: 'tq',
    }
    expect(execution.workflowId).toBeTruthy()
    expect(execution.runId).toBeTruthy()
    expect(['single', 'multi', 'daily']).toContain(execution.type)
  })

  it('SystemHealth structure is valid', () => {
    const health = {
      temporal: { connected: true, namespace: 'default', taskQueue: 'investigate-task-queue' },
      worker: { connected: true, count: 1 },
      api: 'healthy' as const,
    }
    expect(health.api).toBe('healthy')
    expect(health.temporal.connected).toBe(true)
    expect(health.worker.count).toBeGreaterThan(0)
  })
})

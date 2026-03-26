import { describe, it, expect } from 'vitest'
import { groupActivities, type Activity } from '@/components/ActivityGantt'
import type { WorkflowEvent } from '@/lib/types'

function makeEvent(
  eventId: string,
  eventType: string,
  eventTime: string,
  details?: any
): WorkflowEvent {
  return { eventId, eventTime, eventType, details }
}

describe('groupActivities', () => {
  it('returns empty array for no events', () => {
    expect(groupActivities([])).toEqual([])
  })

  it('returns empty array when no activity events', () => {
    const events = [
      makeEvent('1', 'WorkflowExecutionStarted', '2026-01-01T00:00:00Z'),
      makeEvent('2', 'WorkflowTaskScheduled', '2026-01-01T00:00:01Z'),
    ]
    expect(groupActivities(events)).toEqual([])
  })

  it('groups scheduled + started + completed into one activity', () => {
    const events = [
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'clone_repository' },
      }),
      makeEvent('11', 'ActivityTaskStarted', '2026-01-01T00:00:01Z', {
        scheduledEventId: '10',
      }),
      makeEvent('12', 'ActivityTaskCompleted', '2026-01-01T00:00:05Z', {
        scheduledEventId: '10',
      }),
    ]
    const activities = groupActivities(events)
    expect(activities).toHaveLength(1)
    expect(activities[0].activityType).toBe('clone_repository')
    expect(activities[0].status).toBe('completed')
    expect(activities[0].events).toHaveLength(3)
    expect(activities[0].durationMs).toBe(4000)
  })

  it('handles EVENT_TYPE_ prefixed event names', () => {
    const events = [
      makeEvent('10', 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED', '2026-01-01T00:00:00Z', {
        activityType: { name: 'analyze_with_claude_context' },
      }),
      makeEvent('11', 'EVENT_TYPE_ACTIVITY_TASK_STARTED', '2026-01-01T00:00:02Z', {
        scheduledEventId: '10',
      }),
      makeEvent('12', 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED', '2026-01-01T00:01:00Z', {
        scheduledEventId: '10',
      }),
    ]
    const activities = groupActivities(events)
    expect(activities).toHaveLength(1)
    expect(activities[0].status).toBe('completed')
    expect(activities[0].durationMs).toBe(58000)
  })

  it('marks failed activities correctly', () => {
    const events = [
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'save_results' },
      }),
      makeEvent('11', 'ActivityTaskStarted', '2026-01-01T00:00:01Z', {
        scheduledEventId: '10',
      }),
      makeEvent('12', 'ActivityTaskFailed', '2026-01-01T00:00:03Z', {
        scheduledEventId: '10',
        failure: { message: 'DynamoDB error' },
      }),
    ]
    const activities = groupActivities(events)
    expect(activities).toHaveLength(1)
    expect(activities[0].status).toBe('failed')
    expect(activities[0].durationMs).toBe(2000)
  })

  it('marks timed-out activities as failed', () => {
    const events = [
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'slow_task' },
      }),
      makeEvent('11', 'ActivityTaskStarted', '2026-01-01T00:00:01Z', {
        scheduledEventId: '10',
      }),
      makeEvent('12', 'EVENT_TYPE_ACTIVITY_TASK_TIMED_OUT', '2026-01-01T01:00:00Z', {
        scheduledEventId: '10',
      }),
    ]
    const activities = groupActivities(events)
    expect(activities[0].status).toBe('failed')
  })

  it('detects parallel activities', () => {
    const events = [
      // Two activities scheduled at the same time
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'task_a' },
      }),
      makeEvent('12', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'task_b' },
      }),
      makeEvent('11', 'ActivityTaskStarted', '2026-01-01T00:00:01Z', {
        scheduledEventId: '10',
      }),
      makeEvent('13', 'ActivityTaskStarted', '2026-01-01T00:00:01Z', {
        scheduledEventId: '12',
      }),
      makeEvent('14', 'ActivityTaskCompleted', '2026-01-01T00:00:05Z', {
        scheduledEventId: '10',
      }),
      makeEvent('15', 'ActivityTaskCompleted', '2026-01-01T00:00:08Z', {
        scheduledEventId: '12',
      }),
    ]
    const activities = groupActivities(events)
    expect(activities).toHaveLength(2)
    // Both started at roughly the same time
    expect(activities[0].startedAt).toBe(activities[1].startedAt)
    // task_a finished first
    expect(activities[0].activityType).toBe('task_a')
    expect(activities[0].durationMs).toBe(4000)
    expect(activities[1].activityType).toBe('task_b')
    expect(activities[1].durationMs).toBe(7000)
  })

  it('handles scheduled-only activity (in progress)', () => {
    const events = [
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'pending_task' },
      }),
    ]
    const activities = groupActivities(events)
    expect(activities).toHaveLength(1)
    expect(activities[0].status).toBe('scheduled')
    expect(activities[0].durationMs).toBeUndefined()
  })

  it('handles started-but-not-completed activity', () => {
    const events = [
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'running_task' },
      }),
      makeEvent('11', 'ActivityTaskStarted', '2026-01-01T00:00:01Z', {
        scheduledEventId: '10',
      }),
    ]
    const activities = groupActivities(events)
    expect(activities).toHaveLength(1)
    expect(activities[0].status).toBe('started')
    expect(activities[0].durationMs).toBeUndefined()
  })

  it('sorts activities by scheduledAt time', () => {
    const events = [
      makeEvent('20', 'ActivityTaskScheduled', '2026-01-01T00:05:00Z', {
        activityType: { name: 'second' },
      }),
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'first' },
      }),
    ]
    const activities = groupActivities(events)
    expect(activities[0].activityType).toBe('first')
    expect(activities[1].activityType).toBe('second')
  })

  it('generates friendly display names from snake_case', () => {
    const events = [
      makeEvent('10', 'ActivityTaskScheduled', '2026-01-01T00:00:00Z', {
        activityType: { name: 'analyze_with_claude_context' },
      }),
    ]
    const activities = groupActivities(events)
    expect(activities[0].displayName).toBe('Analyze With Claude Context')
  })
})

import { describe, it, expect } from 'vitest'
import { mapActivityToStep, extractCompletedStepsFromHistory, INVESTIGATION_STEPS } from './investigation-progress'

describe('investigation-progress', () => {
  describe('mapActivityToStep', () => {
    it('maps direct step names to step ids', () => {
      expect(mapActivityToStep('hl_overview')).toBe('hl_overview')
      expect(mapActivityToStep('module_deep_dive')).toBe('module_deep_dive')
      expect(mapActivityToStep('core_entities')).toBe('core_entities')
      expect(mapActivityToStep('DBs')).toBe('DBs')
      expect(mapActivityToStep('APIs')).toBe('APIs')
      expect(mapActivityToStep('security_check')).toBe('security_check')
      expect(mapActivityToStep('deployment')).toBe('deployment')
      expect(mapActivityToStep('monitoring')).toBe('monitoring')
      expect(mapActivityToStep('feature_flags')).toBe('feature_flags')
    })

    it('strips investigate_ prefix', () => {
      expect(mapActivityToStep('investigate_hl_overview')).toBe('hl_overview')
      expect(mapActivityToStep('investigate_module_deep_dive')).toBe('module_deep_dive')
      expect(mapActivityToStep('investigate_DBs')).toBe('DBs')
      expect(mapActivityToStep('investigate_APIs')).toBe('APIs')
    })

    it('handles fuzzy name variations', () => {
      expect(mapActivityToStep('high_level_overview')).toBe('hl_overview')
      expect(mapActivityToStep('overview')).toBe('hl_overview')
      expect(mapActivityToStep('deep_dive')).toBe('module_deep_dive')
      expect(mapActivityToStep('databases')).toBe('DBs')
      expect(mapActivityToStep('apis')).toBe('APIs')
      expect(mapActivityToStep('security')).toBe('security_check')
      expect(mapActivityToStep('prompt_security')).toBe('prompt_security_check')
    })

    it('returns null for unknown step names', () => {
      expect(mapActivityToStep('unknown_step')).toBeNull()
      expect(mapActivityToStep('')).toBeNull()
      expect(mapActivityToStep('clone_repository_activity')).toBeNull()
    })
  })

  describe('extractCompletedStepsFromHistory', () => {
    it('returns empty set for empty events', () => {
      expect(extractCompletedStepsFromHistory([]).size).toBe(0)
    })

    it('returns empty set when no analyze_with_claude_context activities', () => {
      const events = [
        {
          eventId: '1',
          eventTime: '2026-01-01T00:00:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
          details: {
            activityType: { name: 'clone_repository_activity' },
          },
        },
        {
          eventId: '2',
          eventTime: '2026-01-01T00:01:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
          details: {
            scheduledEventId: '1',
          },
        },
      ]
      expect(extractCompletedStepsFromHistory(events).size).toBe(0)
    })

    it('extracts completed steps from base64-encoded payloads', () => {
      // Create base64-encoded payload with step_name
      const payload = btoa(JSON.stringify({
        context_dict: { step_name: 'hl_overview' },
      }))

      const events = [
        {
          eventId: '10',
          eventTime: '2026-01-01T00:00:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
          details: {
            activityType: { name: 'analyze_with_claude_context' },
            input: {
              payloads: [{ data: payload }],
            },
          },
        },
        {
          eventId: '11',
          eventTime: '2026-01-01T00:01:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
          details: {
            scheduledEventId: '10',
          },
        },
      ]

      const completed = extractCompletedStepsFromHistory(events)
      expect(completed.has('hl_overview')).toBe(true)
      expect(completed.size).toBe(1)
    })

    it('handles multiple completed steps', () => {
      const makeScheduled = (eventId: string, stepName: string) => ({
        eventId,
        eventTime: '2026-01-01T00:00:00Z',
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
        details: {
          activityType: { name: 'analyze_with_claude_context' },
          input: {
            payloads: [{ data: btoa(JSON.stringify({ context_dict: { step_name: stepName } })) }],
          },
        },
      })

      const makeCompleted = (eventId: string, scheduledId: string) => ({
        eventId,
        eventTime: '2026-01-01T00:01:00Z',
        eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
        details: { scheduledEventId: scheduledId },
      })

      const events = [
        makeScheduled('10', 'hl_overview'),
        makeScheduled('12', 'module_deep_dive'),
        makeScheduled('14', 'DBs'),
        makeCompleted('11', '10'),
        makeCompleted('13', '12'),
        makeCompleted('15', '14'),
      ]

      const completed = extractCompletedStepsFromHistory(events)
      expect(completed.has('hl_overview')).toBe(true)
      expect(completed.has('module_deep_dive')).toBe(true)
      expect(completed.has('DBs')).toBe(true)
      expect(completed.size).toBe(3)
    })

    it('does not mark scheduled-but-incomplete activities as completed', () => {
      const payload = btoa(JSON.stringify({
        context_dict: { step_name: 'hl_overview' },
      }))

      const events = [
        {
          eventId: '10',
          eventTime: '2026-01-01T00:00:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
          details: {
            activityType: { name: 'analyze_with_claude_context' },
            input: {
              payloads: [{ data: payload }],
            },
          },
        },
        // No COMPLETED event for this one
      ]

      const completed = extractCompletedStepsFromHistory(events)
      expect(completed.size).toBe(0)
    })

    it('handles camelCase event type names', () => {
      const payload = btoa(JSON.stringify({
        context_dict: { step_name: 'APIs' },
      }))

      const events = [
        {
          eventId: '10',
          eventTime: '2026-01-01T00:00:00Z',
          eventType: 'ActivityTaskScheduled',
          details: {
            activityType: { name: 'analyze_with_claude_context' },
            input: {
              payloads: [{ data: payload }],
            },
          },
        },
        {
          eventId: '11',
          eventTime: '2026-01-01T00:01:00Z',
          eventType: 'ActivityTaskCompleted',
          details: { scheduledEventId: '10' },
        },
      ]

      const completed = extractCompletedStepsFromHistory(events)
      expect(completed.has('APIs')).toBe(true)
    })

    it('gracefully handles malformed payloads', () => {
      const events = [
        {
          eventId: '10',
          eventTime: '2026-01-01T00:00:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
          details: {
            activityType: { name: 'analyze_with_claude_context' },
            input: {
              payloads: [{ data: 'not-valid-base64!!!' }],
            },
          },
        },
        {
          eventId: '11',
          eventTime: '2026-01-01T00:01:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
          details: { scheduledEventId: '10' },
        },
      ]

      // Should not throw, just return empty (no step_name extracted)
      const completed = extractCompletedStepsFromHistory(events)
      expect(completed.size).toBe(0)
    })

    it('handles missing input payloads', () => {
      const events = [
        {
          eventId: '10',
          eventTime: '2026-01-01T00:00:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED',
          details: {
            activityType: { name: 'analyze_with_claude_context' },
            // No input field
          },
        },
        {
          eventId: '11',
          eventTime: '2026-01-01T00:01:00Z',
          eventType: 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED',
          details: { scheduledEventId: '10' },
        },
      ]

      const completed = extractCompletedStepsFromHistory(events)
      expect(completed.size).toBe(0)
    })
  })

  describe('INVESTIGATION_STEPS', () => {
    it('has 17 steps', () => {
      expect(INVESTIGATION_STEPS.length).toBe(17)
    })

    it('has unique ids', () => {
      const ids = INVESTIGATION_STEPS.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})

import { WorkflowEvent } from '@/lib/types'

/**
 * Map an activity step name (from the Python worker) to an INVESTIGATION_STEPS id.
 * The step names from the worker's processing_order match the INVESTIGATION_STEPS ids.
 */
export const INVESTIGATION_STEPS = [
  { id: 'hl_overview', label: 'Overview' },
  { id: 'module_deep_dive', label: 'Module Deep Dive' },
  { id: 'core_entities', label: 'Core Entities' },
  { id: 'data_mapping', label: 'Data Mapping' },
  { id: 'DBs', label: 'Databases' },
  { id: 'APIs', label: 'APIs' },
  { id: 'events', label: 'Events' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'service_dependencies', label: 'Service Dependencies' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'authorization', label: 'Authorization' },
  { id: 'security_check', label: 'Security' },
  { id: 'prompt_security_check', label: 'Prompt Security' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'ml_services', label: 'ML Services' },
  { id: 'feature_flags', label: 'Feature Flags' },
] as const

export function mapActivityToStep(stepName: string): string | null {
  // Direct mapping: step_name in the worker matches step.id in INVESTIGATION_STEPS
  const directMatch = INVESTIGATION_STEPS.find((s) => s.id === stepName)
  if (directMatch) return directMatch.id

  // Try with investigate_ prefix stripped (some activity names have it)
  const stripped = stepName.replace(/^investigate_/, '')
  const strippedMatch = INVESTIGATION_STEPS.find((s) => s.id === stripped)
  if (strippedMatch) return strippedMatch.id

  // Fuzzy: handle common variations
  const normalizedMap: Record<string, string> = {
    'high_level_overview': 'hl_overview',
    'overview': 'hl_overview',
    'deep_dive': 'module_deep_dive',
    'databases': 'DBs',
    'apis': 'APIs',
    'security': 'security_check',
    'prompt_security': 'prompt_security_check',
  }
  const normalized = normalizedMap[stepName] || normalizedMap[stripped]
  if (normalized) return normalized

  return null
}

/**
 * Extract completed investigation step IDs from workflow history events.
 */
export function extractCompletedStepsFromHistory(events: WorkflowEvent[]): Set<string> {
  const completedIds = new Set<string>()

  // Map: scheduledEventId → { activityType, stepName? }
  const scheduledActivities = new Map<string, { activityType: string; stepName?: string }>()

  for (const event of events) {
    const type = event.eventType

    // Collect ACTIVITY_TASK_SCHEDULED events
    if (type === 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED' || type === 'ActivityTaskScheduled') {
      const attrs = event.details || {}
      const activityType = attrs.activityType?.name || ''
      const eventId = event.eventId

      let stepName: string | undefined

      // Try to extract step_name from the input payload
      if (activityType === 'analyze_with_claude_context' || activityType === 'save_prompt_context_activity') {
        try {
          const payloads = attrs.input?.payloads
          if (Array.isArray(payloads) && payloads.length > 0) {
            const payload = payloads[0]
            let decoded: string | undefined

            if (payload.data) {
              // Temporal HTTP API returns base64-encoded payloads
              if (typeof atob !== 'undefined') {
                decoded = atob(payload.data)
              } else {
                decoded = Buffer.from(payload.data, 'base64').toString('utf-8')
              }
            }

            if (decoded) {
              const parsed = JSON.parse(decoded)
              // AnalyzeWithClaudeInput has context_dict.step_name
              stepName = parsed?.context_dict?.step_name || parsed?.step_name
            }
          }
        } catch {
          // Payload parsing is best-effort — ignore failures
        }
      }

      scheduledActivities.set(eventId, { activityType, stepName })
    }

    // Match ACTIVITY_TASK_COMPLETED events to their scheduled events
    if (type === 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED' || type === 'ActivityTaskCompleted') {
      const attrs = event.details || {}
      const scheduledEventId = attrs.scheduledEventId?.toString()

      if (scheduledEventId && scheduledActivities.has(scheduledEventId)) {
        const scheduled = scheduledActivities.get(scheduledEventId)!

        if (scheduled.activityType === 'analyze_with_claude_context' && scheduled.stepName) {
          // This is a completed investigation step — map it
          const stepId = mapActivityToStep(scheduled.stepName)
          if (stepId) completedIds.add(stepId)
        }
      }
    }
  }

  return completedIds
}

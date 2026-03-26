'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils'
import type { WorkflowEvent } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Activity {
  /** The eventId of the SCHEDULED event — used as group key */
  scheduledEventId: string
  activityType: string
  /** Friendly display name */
  displayName: string
  status: 'scheduled' | 'started' | 'completed' | 'failed'
  scheduledAt: number   // epoch-ms
  startedAt?: number
  completedAt?: number
  durationMs?: number
  /** Raw events belonging to this activity (Scheduled / Started / Completed / Failed) */
  events: WorkflowEvent[]
}

/* ------------------------------------------------------------------ */
/* Parse history events into grouped activities                        */
/* ------------------------------------------------------------------ */

function isActivityScheduled(t: string) {
  return t === 'ActivityTaskScheduled' || t === 'EVENT_TYPE_ACTIVITY_TASK_SCHEDULED'
}
function isActivityStarted(t: string) {
  return t === 'ActivityTaskStarted' || t === 'EVENT_TYPE_ACTIVITY_TASK_STARTED'
}
function isActivityCompleted(t: string) {
  return t === 'ActivityTaskCompleted' || t === 'EVENT_TYPE_ACTIVITY_TASK_COMPLETED'
}
function isActivityFailed(t: string) {
  return t === 'ActivityTaskFailed' || t === 'EVENT_TYPE_ACTIVITY_TASK_FAILED'
}
function isActivityTimedOut(t: string) {
  return t === 'ActivityTaskTimedOut' || t === 'EVENT_TYPE_ACTIVITY_TASK_TIMED_OUT'
}

function friendlyName(activityType: string): string {
  // snake_case → Title Case
  return activityType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function groupActivities(events: WorkflowEvent[]): Activity[] {
  const byScheduledId = new Map<string, Activity>()

  for (const ev of events) {
    const t = ev.eventType

    if (isActivityScheduled(t)) {
      const activityType = ev.details?.activityType?.name || 'unknown'
      byScheduledId.set(ev.eventId, {
        scheduledEventId: ev.eventId,
        activityType,
        displayName: friendlyName(activityType),
        status: 'scheduled',
        scheduledAt: new Date(ev.eventTime).getTime(),
        events: [ev],
      })
    } else if (isActivityStarted(t)) {
      const sid = ev.details?.scheduledEventId?.toString()
      const act = sid ? byScheduledId.get(sid) : undefined
      if (act) {
        act.status = 'started'
        act.startedAt = new Date(ev.eventTime).getTime()
        act.events.push(ev)
      }
    } else if (isActivityCompleted(t)) {
      const sid = ev.details?.scheduledEventId?.toString()
      const act = sid ? byScheduledId.get(sid) : undefined
      if (act) {
        act.status = 'completed'
        act.completedAt = new Date(ev.eventTime).getTime()
        act.durationMs = act.completedAt - (act.startedAt ?? act.scheduledAt)
        act.events.push(ev)
      }
    } else if (isActivityFailed(t) || isActivityTimedOut(t)) {
      const sid = ev.details?.scheduledEventId?.toString()
      const act = sid ? byScheduledId.get(sid) : undefined
      if (act) {
        act.status = 'failed'
        act.completedAt = new Date(ev.eventTime).getTime()
        act.durationMs = act.completedAt - (act.startedAt ?? act.scheduledAt)
        act.events.push(ev)
      }
    }
  }

  // Sort by scheduledAt ascending
  return Array.from(byScheduledId.values()).sort((a, b) => a.scheduledAt - b.scheduledAt)
}

/* ------------------------------------------------------------------ */
/* Gantt bar sizing                                                    */
/* ------------------------------------------------------------------ */

interface BarLayout {
  leftPct: number
  widthPct: number
}

function computeBarLayouts(activities: Activity[]): Map<string, BarLayout> {
  if (activities.length === 0) return new Map()

  const minTs = Math.min(...activities.map((a) => a.scheduledAt))
  const maxTs = Math.max(
    ...activities.map((a) => a.completedAt ?? a.startedAt ?? a.scheduledAt)
  )
  const span = maxTs - minTs || 1 // avoid div-by-zero

  const layouts = new Map<string, BarLayout>()
  for (const act of activities) {
    const start = act.startedAt ?? act.scheduledAt
    const end = act.completedAt ?? Date.now()
    const leftPct = ((start - minTs) / span) * 100
    const widthPct = Math.max(((end - start) / span) * 100, 0.5) // min visible width
    layouts.set(act.scheduledEventId, { leftPct, widthPct })
  }
  return layouts
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: Activity['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
    case 'started':
      return <Loader2 className="h-4 w-4 text-blue-400 shrink-0 animate-spin" />
    case 'scheduled':
      return <Clock className="h-4 w-4 text-muted-foreground/50 shrink-0" />
  }
}

const barColorClass: Record<Activity['status'], string> = {
  completed: 'bg-green-500/70',
  failed: 'bg-red-500/70',
  started: 'bg-blue-500/60 animate-pulse',
  scheduled: 'bg-gray-500/40',
}

function ActivityRow({
  activity,
  bar,
}: {
  activity: Activity
  bar: BarLayout
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      activity.status === 'failed' ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-card/50',
    )}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/30 transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <StatusIcon status={activity.status} />

        {/* Activity name — truncate */}
        <span className={cn(
          'text-sm font-medium truncate min-w-0 flex-shrink',
          activity.status === 'failed' && 'text-red-400',
          activity.status === 'completed' && 'text-green-400',
          activity.status === 'started' && 'text-blue-400',
          activity.status === 'scheduled' && 'text-muted-foreground/60',
        )}>
          {activity.displayName}
        </span>

        {/* Gantt bar — flexible middle area */}
        <div className="flex-1 h-5 relative mx-2 min-w-[120px]">
          {/* Track */}
          <div className="absolute inset-0 rounded-full bg-muted/30" />
          {/* Bar */}
          <div
            className={cn('absolute top-0 bottom-0 rounded-full', barColorClass[activity.status])}
            style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
          />
        </div>

        {/* Duration badge */}
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">
          {activity.durationMs != null ? formatDuration(activity.durationMs) : '—'}
        </span>
      </button>

      {/* Expanded: raw events */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-border/50 ml-6">
          {activity.events.map((ev) => {
            const typeLower = ev.eventType.toLowerCase()
            const isFailed = typeLower.includes('failed') || typeLower.includes('timedout')
            return (
              <div
                key={ev.eventId}
                className={cn(
                  'flex items-center gap-3 text-xs py-1.5 px-2 rounded',
                  isFailed ? 'bg-red-500/10' : 'bg-background/50',
                )}
              >
                <span className="text-muted-foreground tabular-nums shrink-0">
                  #{ev.eventId}
                </span>
                <span className={cn('font-medium', isFailed && 'text-red-400')}>
                  {formatEventTypeShort(ev.eventType)}
                </span>
                <span className="text-muted-foreground ml-auto shrink-0">
                  {format(new Date(ev.eventTime), 'HH:mm:ss.SSS')}
                </span>
              </div>
            )
          })}

          {/* Show failure details if present */}
          {activity.status === 'failed' && (() => {
            const failEv = activity.events.find(
              (e) => e.eventType.toLowerCase().includes('failed') || e.eventType.toLowerCase().includes('timedout')
            )
            const failure = failEv?.details?.failure
            if (!failure?.message) return null
            return (
              <div className="mt-1 p-2 bg-red-950/20 rounded border border-red-800/40 text-xs">
                <p className="text-red-400">{failure.message}</p>
                {failure.cause?.message && failure.cause.message !== failure.message && (
                  <p className="text-red-300 mt-1">Cause: {failure.cause.message}</p>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function formatEventTypeShort(eventType: string): string {
  // "ActivityTaskScheduled" → "Scheduled"
  // "EVENT_TYPE_ACTIVITY_TASK_SCHEDULED" → "Scheduled"
  const cleaned = eventType
    .replace(/^EVENT_TYPE_/, '')
    .replace(/^ACTIVITY_TASK_/, '')
    .replace(/^ActivityTask/, '')
  if (!cleaned) return eventType
  // If it was UPPER_CASE, titlecase it
  if (cleaned.includes('_')) {
    return cleaned
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }
  // PascalCase → add spaces
  return cleaned.replace(/([A-Z])/g, ' $1').trim()
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

interface ActivityGanttProps {
  events: WorkflowEvent[]
  isRunning?: boolean
}

export function ActivityGantt({ events, isRunning }: ActivityGanttProps) {
  const activities = useMemo(() => groupActivities(events), [events])
  const barLayouts = useMemo(() => computeBarLayouts(activities), [activities])

  if (activities.length === 0) return null

  const completedCount = activities.filter((a) => a.status === 'completed').length
  const failedCount = activities.filter((a) => a.status === 'failed').length
  const runningCount = activities.filter((a) => a.status === 'started').length

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Activities</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{activities.length} total</span>
          {completedCount > 0 && (
            <span className="text-green-500">{completedCount} completed</span>
          )}
          {runningCount > 0 && (
            <span className="text-blue-400">{runningCount} running</span>
          )}
          {failedCount > 0 && (
            <span className="text-red-500">{failedCount} failed</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {activities.map((act) => (
          <ActivityRow
            key={act.scheduledEventId}
            activity={act}
            bar={barLayouts.get(act.scheduledEventId)!}
          />
        ))}
      </div>
    </div>
  )
}

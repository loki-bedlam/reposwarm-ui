import { format } from 'date-fns'
import { Circle, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TimelineEventProps {
  event: {
    eventId: string
    eventTime: string
    eventType: string
    details?: any
  }
  isLast?: boolean
}

export function TimelineEvent({ event, isLast = false }: TimelineEventProps) {
  const [stackTraceExpanded, setStackTraceExpanded] = useState(false)

  const getEventIcon = () => {
    const type = event.eventType.toLowerCase()
    if (type.includes('started')) return <Circle className="h-4 w-4 text-blue-500" />
    if (type.includes('completed')) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (type.includes('failed')) return <XCircle className="h-4 w-4 text-red-500" />
    if (type.includes('timer')) return <Clock className="h-4 w-4 text-orange-500" />
    return <AlertCircle className="h-4 w-4 text-gray-500" />
  }

  const formatEventType = (type: string) => {
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const hasNonEmptyDetails = (details: any): boolean => {
    if (!details) return false
    if (typeof details !== 'object') return true
    return Object.keys(details).length > 0
  }

  const renderDetails = () => {
    const details = event.details
    if (!hasNonEmptyDetails(details)) return null

    const failure = details.failure
    if (failure) {
      const mainMessage = failure.message
      const causeMessage = failure.cause?.message
      const showCause = causeMessage && causeMessage !== mainMessage
      const stackTrace = failure.stackTrace

      return (
        <div className="mt-3 p-3 bg-red-950/20 rounded border border-red-800/40">
          {/* Main error message */}
          <p className="text-sm font-medium text-red-400">
            {mainMessage || 'Unknown error'}
          </p>

          {/* Source */}
          {failure.source && (
            <p className="mt-1 text-xs text-muted-foreground">
              Source: <span className="font-mono">{failure.source}</span>
            </p>
          )}

          {/* Cause message */}
          {showCause && (
            <div className="mt-2 p-2 bg-red-950/30 rounded border border-red-800/30">
              <p className="text-xs text-muted-foreground mb-1">Caused by:</p>
              <p className="text-xs text-red-300">{causeMessage}</p>
              {failure.cause?.applicationFailureInfo?.type && (
                <p className="text-xs text-muted-foreground mt-1">
                  Type: <span className="font-mono">{failure.cause.applicationFailureInfo.type}</span>
                  {failure.cause.applicationFailureInfo.nonRetryable && (
                    <span className="ml-2 text-orange-400">(non-retryable)</span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Stack trace (collapsible) */}
          {stackTrace && (
            <div className="mt-2">
              <button
                onClick={() => setStackTraceExpanded(!stackTraceExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {stackTraceExpanded
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />
                }
                Stack trace
              </button>
              {stackTraceExpanded && (
                <pre className="mt-2 text-xs font-mono overflow-x-auto text-red-300/70 whitespace-pre-wrap">
                  {stackTrace}
                </pre>
              )}
            </div>
          )}
        </div>
      )
    }

    // Non-failure: render raw JSON
    return (
      <div className="mt-3 p-3 bg-background rounded border border-border">
        <pre className="text-xs font-mono overflow-x-auto">
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="p-2 bg-card rounded-full border border-border">
          {getEventIcon()}
        </div>
        {!isLast && (
          <div className="w-px bg-border flex-1 mt-2" />
        )}
      </div>
      <div className="flex-1 pb-8">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium">{formatEventType(event.eventType)}</h4>
            <span className="text-xs text-muted-foreground">
              {format(new Date(event.eventTime), 'MMM d, HH:mm:ss')}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Event ID: {event.eventId}
          </div>
          {renderDetails()}
        </div>
      </div>
    </div>
  )
}
import { format } from 'date-fns'
import { Circle, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          {event.details && (
            <div className="mt-3 p-3 bg-background rounded border border-border">
              <pre className="text-xs font-mono overflow-x-auto">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
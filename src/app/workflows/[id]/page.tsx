'use client'

import { useParams, useRouter } from 'next/navigation'
import { useWorkflow, useWorkflowHistory, useTerminateWorkflow } from '@/hooks/useWorkflows'
import { useWikiSections } from '@/hooks/useWiki'
import { StatusBadge } from '@/components/StatusBadge'
import { TimelineEvent } from '@/components/TimelineEvent'
import { JsonViewer } from '@/components/JsonViewer'
import { formatDate, formatDuration } from '@/lib/utils'
import { ArrowLeft, StopCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { TriggerModal } from '@/components/TriggerModal'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const INVESTIGATION_STEPS = [
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

function extractRepoName(workflowId: string): string | null {
  // Format: investigate-single-{repoName}-{timestamp}
  if (!workflowId.startsWith('investigate-single-')) return null
  let name = workflowId.replace('investigate-single-', '')
  // Strip trailing timestamp (digits after last dash)
  const lastDash = name.lastIndexOf('-')
  if (lastDash > 0) {
    const suffix = name.slice(lastDash + 1)
    if (/^\d{8,}$/.test(suffix)) {
      name = name.slice(0, lastDash)
    }
  }
  return name
}

interface InvestigationProgressProps {
  workflowId: string
  isRunning: boolean
}

function InvestigationProgress({ workflowId, isRunning }: InvestigationProgressProps) {
  const repoName = extractRepoName(workflowId)
  const { data: wikiData } = useWikiSections(repoName, isRunning ? 5000 : false)

  const completedIds = new Set((wikiData?.sections ?? []).map((s) => s.id))
  const completedCount = INVESTIGATION_STEPS.filter((step) => completedIds.has(step.id)).length
  const totalSteps = INVESTIGATION_STEPS.length
  const pct = Math.round((completedCount / totalSteps) * 100)

  // First incomplete step = active (when running)
  const activeStep = isRunning
    ? INVESTIGATION_STEPS.find((step) => !completedIds.has(step.id))
    : undefined

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold mb-4">Investigation Progress</h2>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">
            {completedCount}/{totalSteps} steps
          </span>
          <span className="font-medium text-amber-500">{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Summary line */}
      <p className="text-sm text-muted-foreground mb-5">
        {completedCount}/{totalSteps} steps · {pct}%
        {activeStep && (
          <> · <span className="text-amber-400">Current: {activeStep.label}</span></>
        )}
      </p>

      {/* Step checklist — 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {INVESTIGATION_STEPS.map((step) => {
          const done = completedIds.has(step.id)
          const active = activeStep?.id === step.id

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                done
                  ? 'bg-green-500/10'
                  : active
                  ? 'bg-amber-500/10'
                  : 'bg-background/50'
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : active ? (
                <Loader2 className="h-4 w-4 text-amber-400 shrink-0 animate-spin" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={cn(
                  done
                    ? 'text-green-400'
                    : active
                    ? 'text-amber-400 font-medium'
                    : 'text-muted-foreground/60'
                )}
              >
                {step.label}
              </span>
              {active && (
                <span className="ml-auto text-xs text-amber-500/80 font-medium">active</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WorkflowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string
  const [showTerminateModal, setShowTerminateModal] = useState(false)

  const { data: workflow, isLoading: workflowLoading } = useWorkflow(workflowId)
  const { data: history, isLoading: historyLoading } = useWorkflowHistory(workflowId)
  const terminateWorkflow = useTerminateWorkflow()

  const handleTerminate = async () => {
    try {
      await terminateWorkflow.mutateAsync({
        workflowId,
        runId: workflow?.runId,
        reason: 'Terminated via UI'
      })
      toast.success('Workflow terminated successfully')
      setShowTerminateModal(false)
    } catch (error) {
      toast.error('Failed to terminate workflow')
    }
  }

  if (workflowLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading workflow details...</div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Workflow not found</div>
      </div>
    )
  }

  const isRunning = workflow.status === 'Running'
  const isSingleInvestigation = workflow.type === 'single' || workflow.type === 'InvestigateSingleRepoWorkflow'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/workflows')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold font-mono">{workflow.workflowId}</h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <StatusBadge status={workflow.status} />
              {workflow.stale && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  STALE
                </span>
              )}
              <span className="text-sm text-muted-foreground capitalize">
                {workflow.type} workflow
              </span>
            </div>
          </div>
          {isRunning && (
            <button
              onClick={() => setShowTerminateModal(true)}
              className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Terminate
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Start Time</p>
            <p className="font-medium">{formatDate(workflow.startTime)}</p>
            {isRunning && (
              <p className="text-xs text-muted-foreground mt-0.5">started {workflow.startedAgo}</p>
            )}
          </div>
          {workflow.closeTime && (
            <div>
              <p className="text-sm text-muted-foreground">End Time</p>
              <p className="font-medium">{formatDate(workflow.closeTime)}</p>
            </div>
          )}
          {workflow.duration && (
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{formatDuration(workflow.duration)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Task Queue</p>
            <p className="font-medium">{workflow.taskQueueName}</p>
          </div>
        </div>
      </div>

      {/* Investigation Progress — only for single-repo investigation workflows */}
      {isSingleInvestigation && (
        <InvestigationProgress workflowId={workflow.workflowId} isRunning={isRunning} />
      )}

      {/* Input/Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Input</h2>
          <div className="bg-background p-4 rounded-lg border border-border overflow-auto max-h-96">
            <JsonViewer data={workflow.input} defaultExpanded />
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Output</h2>
          <div className="bg-background p-4 rounded-lg border border-border overflow-auto max-h-96">
            <JsonViewer data={workflow.result || workflow.memo} defaultExpanded />
          </div>
        </div>
      </div>

      {/* Event History */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Event History</h2>
        <div className="space-y-2">
          {history?.events.map((event, index) => (
            <TimelineEvent
              key={event.eventId}
              event={event}
              isLast={index === history.events.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Terminate Modal */}
      <TriggerModal
        isOpen={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        onConfirm={handleTerminate}
        title="Terminate Workflow"
        description="Are you sure you want to terminate this workflow? This action cannot be undone."
        confirmText="Terminate"
        isLoading={terminateWorkflow.isPending}
      />
    </div>
  )
}

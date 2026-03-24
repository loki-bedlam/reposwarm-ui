'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkflows } from '@/hooks/useWorkflows'
import { useWikiSections } from '@/hooks/useWiki'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate, formatDuration } from '@/lib/utils'
import { WorkflowExecution } from '@/lib/types'
import { Filter, BookOpen, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 17

const INVESTIGATION_STEP_IDS = [
  'hl_overview',
  'module_deep_dive',
  'core_entities',
  'data_mapping',
  'DBs',
  'APIs',
  'events',
  'dependencies',
  'service_dependencies',
  'authentication',
  'authorization',
  'security_check',
  'prompt_security_check',
  'deployment',
  'monitoring',
  'ml_services',
  'feature_flags',
] as const

function extractRepoName(workflowId: string): string | null {
  // investigate-single-{repoName}-{timestamp}
  const singleMatch = workflowId.match(/^investigate-single-(.+)-\d+$/)
  if (singleMatch) return singleMatch[1]
  return null
}

interface WorkflowProgressBarProps {
  workflowId: string
  isRunning: boolean
}

/** Compact progress bar for workflow list cards — only rendered for single-repo investigation workflows. */
function WorkflowProgressBar({ workflowId, isRunning }: WorkflowProgressBarProps) {
  const repoName = extractRepoName(workflowId)
  const { data: wikiData } = useWikiSections(repoName, isRunning ? 5000 : false)

  const completedIds = new Set((wikiData?.sections ?? []).map((s) => s.id))
  const completedCount = INVESTIGATION_STEP_IDS.filter((id) => completedIds.has(id)).length
  const pct = Math.round((completedCount / TOTAL_STEPS) * 100)

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span className="font-medium">
          {completedCount}/{TOTAL_STEPS} steps
        </span>
        <span className={cn(completedCount > 0 ? 'text-amber-500' : '')}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [pageToken, setPageToken] = useState<string>()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data, isLoading } = useWorkflows(25, pageToken)

  const filteredWorkflows = (data?.executions || []).filter((w: WorkflowExecution) => {
    if (statusFilter !== 'all' && w.status.toLowerCase() !== statusFilter) return false
    if (typeFilter !== 'all' && w.type !== typeFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="single">Single Repo</option>
              <option value="multi">Multi Repo</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflows */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
            Loading workflows...
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
            No workflows found
          </div>
        ) : (
          filteredWorkflows.map((wf: WorkflowExecution) => {
            const repoName = extractRepoName(wf.workflowId)
            const isCompleted = wf.status.toLowerCase() === 'completed'
            const isRunning = wf.status.toLowerCase() === 'running'
            const isFailed = wf.status.toLowerCase() === 'failed'
            const isTerminated = wf.status.toLowerCase() === 'terminated'
            const isSingle = wf.type === 'single'

            return (
              <div
                key={`${wf.workflowId}-${wf.runId}`}
                className={cn(
                  'bg-card rounded-lg border p-4 lg:p-5 transition-all',
                  wf.stale ? 'border-amber-500/40 bg-amber-500/5 shadow-sm shadow-amber-500/10' :
                  isRunning ? 'border-yellow-500/30 shadow-sm shadow-yellow-500/5' :
                  isCompleted ? 'border-green-500/30' :
                  isFailed ? 'border-red-500/30' :
                  isTerminated ? 'border-purple-500/20' :
                  'border-border'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      'w-1 h-12 rounded-full shrink-0',
                      wf.stale ? 'bg-amber-500 animate-pulse' :
                      isRunning ? 'bg-yellow-500 animate-pulse' :
                      isCompleted ? 'bg-green-500' :
                      isFailed ? 'bg-red-500' :
                      'bg-purple-500'
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm truncate">{wf.workflowId}</span>
                        <StatusBadge status={wf.status} />
                        {wf.stale && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            STALE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{wf.type} repo</span>
                        {isRunning && <span>started {wf.startedAgo}</span>}
                        {!isRunning && <span>{formatDate(wf.startTime)}</span>}
                        {wf.duration && <span>{formatDuration(wf.duration)}</span>}
                      </div>

                      {/* Compact progress bar for single-repo investigation workflows */}
                      {isSingle && (
                        <WorkflowProgressBar workflowId={wf.workflowId} isRunning={isRunning} />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-4 lg:pl-0">
                    {isCompleted && repoName && (
                      <Link
                        href={`/repos/${encodeURIComponent(repoName)}/wiki`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        View Wiki
                      </Link>
                    )}
                    <button
                      onClick={() => router.push(`/workflows/${wf.workflowId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {data?.nextPageToken && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setPageToken(data.nextPageToken)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

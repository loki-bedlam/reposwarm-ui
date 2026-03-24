'use client'

import { useWorkflows } from '@/hooks/useWorkflows'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function extractRepoName(workflowId: string): string {
  // Format: investigate-single-{repoName}-{timestamp}
  if (workflowId.startsWith('investigate-single-')) {
    let name = workflowId.replace('investigate-single-', '')
    const lastDash = name.lastIndexOf('-')
    if (lastDash > 0) {
      const suffix = name.slice(lastDash + 1)
      if (/^\d{8,}$/.test(suffix)) {
        name = name.slice(0, lastDash)
      }
    }
    return name
  }
  // Format: investigate-multi-{timestamp}
  if (workflowId.startsWith('investigate-multi-')) {
    return '(multi-repo)'
  }
  return workflowId
}

function extractErrorMessage(workflow: any): string {
  // Try to pull a meaningful error string from available fields
  if (workflow.failure) {
    if (typeof workflow.failure === 'string') return workflow.failure
    if (typeof workflow.failure === 'object') {
      return (
        workflow.failure.message ||
        workflow.failure.cause?.message ||
        JSON.stringify(workflow.failure)
      )
    }
  }
  if (workflow.result) {
    if (typeof workflow.result === 'string') return workflow.result
    if (typeof workflow.result === 'object') {
      return (
        workflow.result.error ||
        workflow.result.message ||
        JSON.stringify(workflow.result)
      )
    }
  }
  return 'No error details available'
}

export default function ErrorsPage() {
  // Fetch up to 100 workflows and filter for Failed ones client-side
  const { data, isLoading, isError } = useWorkflows(100)

  const failedWorkflows = (data?.executions ?? [])
    .filter((wf) => wf.status === 'Failed' || wf.status === 'Terminated')
    .sort((a, b) => {
      // Sort by closeTime desc (most recent first), fallback to startTime
      const aTime = a.closeTime || a.startTime
      const bTime = b.closeTime || b.startTime
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">Failed to load workflow data.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-red-500" />
          Errors
        </h1>
        <p className="text-muted-foreground mt-1">
          Failed and terminated workflows with debugging info
        </p>
      </div>

      {/* Empty state */}
      {failedWorkflows.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-16 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold mb-2">No errors — all systems go!</h2>
          <p className="text-muted-foreground">
            There are no failed or terminated workflows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {failedWorkflows.map((workflow) => {
            const errorMessage = extractErrorMessage(workflow)
            const repoName = extractRepoName(workflow.workflowId)
            const timestamp = workflow.closeTime || workflow.startTime

            return (
              <div
                key={`${workflow.workflowId}-${workflow.runId}`}
                className="bg-card rounded-lg border border-red-500/20 p-5 hover:border-red-500/40 transition-colors"
              >
                {/* Top row: ID + status badge */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/workflows/${encodeURIComponent(workflow.workflowId)}`}
                      className="font-mono text-sm font-medium text-primary hover:underline break-all"
                    >
                      {workflow.workflowId}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Repo: <span className="text-foreground">{repoName}</span>
                      {' · '}
                      {formatDate(timestamp)}
                    </div>
                  </div>
                  <StatusBadge status={workflow.status} />
                </div>

                {/* Error message */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-md px-4 py-3">
                  <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-1">
                    Error
                  </p>
                  <p className="text-sm text-red-300 break-words">{errorMessage}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

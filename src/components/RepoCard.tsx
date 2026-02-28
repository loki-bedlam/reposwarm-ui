import { GitBranch, Clock, Check, X, Play, BookOpen, StopCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Repository, WorkflowExecution } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface RepoCardProps {
  repo: Repository
  onToggle?: (repo: Repository) => void
  onDelete?: (repo: Repository) => void
  onTrigger?: (repo: Repository) => void
  onCancelWorkflow?: (workflowId: string) => void
  triggerPending?: boolean
  runningWorkflow?: WorkflowExecution | null
}

export function RepoCard({ repo, onToggle, onDelete, onTrigger, onCancelWorkflow, triggerPending, runningWorkflow }: RepoCardProps) {
  const isInvestigating = !!runningWorkflow

  const handleCancel = async () => {
    if (!runningWorkflow) return
    try {
      const { apiFetch } = await import('@/lib/api')
      const res = await apiFetch(`/workflows/${runningWorkflow.workflowId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled from repo card' })
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (err) {
      console.error('Failed to cancel workflow:', err)
    }
  }

  return (
    <div className={cn(
      'bg-card p-4 lg:p-6 rounded-lg border transition-all',
      isInvestigating
        ? 'border-yellow-500/40 shadow-sm shadow-yellow-500/5'
        : 'border-border hover:border-primary/50'
    )}>
      {/* Investigating banner */}
      {isInvestigating && (
        <div className="flex items-center justify-between gap-2 mb-4 px-3 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Investigating...
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
          >
            <StopCircle className="h-3 w-3" />
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'p-2 rounded-lg shrink-0',
            isInvestigating ? 'bg-yellow-500/10' : 'bg-primary/10'
          )}>
            <GitBranch className={cn('h-5 w-5', isInvestigating ? 'text-yellow-500' : 'text-primary')} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{repo.name}</h3>
            <p className="text-sm text-muted-foreground">{repo.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onTrigger && repo.enabled && !isInvestigating && (
            <button
              onClick={() => onTrigger(repo)}
              disabled={triggerPending}
              className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              title="Investigate this repo"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {onToggle && (
            <button
              onClick={() => onToggle(repo)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                repo.enabled
                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                  : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
              )}
              title={repo.enabled ? 'Disable' : 'Enable'}
            >
              {repo.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(repo)}
              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              title="Delete"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="truncate">Last analyzed: {repo.lastAnalyzed ? formatDate(repo.lastAnalyzed) : 'Never'}</span>
        </div>
        {repo.lastCommit && (
          <div className="text-xs text-muted-foreground truncate">
            Last commit: {repo.lastCommit.substring(0, 20)}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              repo.status === 'active'
                ? 'bg-green-500/10 text-green-500'
                : repo.status === 'error'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-gray-500/10 text-gray-500'
            )}
          >
            {repo.status || 'inactive'}
          </span>
          <div className="flex gap-3">
            <Link
              href={`/repos/${encodeURIComponent(repo.name)}/wiki`}
              className={cn(
                'text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 transition-colors',
                repo.hasDocs
                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                  : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
              )}
            >
              <BookOpen className="h-3 w-3" />
              Wiki
            </Link>
            <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
              Source →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

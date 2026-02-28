import { GitBranch, Clock, Check, X, Play } from 'lucide-react'
import { Repository } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface RepoCardProps {
  repo: Repository
  onToggle?: (repo: Repository) => void
  onDelete?: (repo: Repository) => void
  onTrigger?: (repo: Repository) => void
  triggerPending?: boolean
}

export function RepoCard({ repo, onToggle, onDelete, onTrigger, triggerPending }: RepoCardProps) {
  return (
    <div className="bg-card p-4 lg:p-6 rounded-lg border border-border hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{repo.name}</h3>
            <p className="text-sm text-muted-foreground">{repo.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onTrigger && repo.enabled && (
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
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View →
          </a>
        </div>
      </div>
    </div>
  )
}

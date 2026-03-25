'use client'

import { useState } from 'react'
import { useRepos, useAddRepo, useUpdateRepo, useDeleteRepo, useDiscoverRepos } from '@/hooks/useRepos'
import { useTriggerSingle } from '@/hooks/useTrigger'
import { useWorkflows } from '@/hooks/useWorkflows'
import { RepoCard } from '@/components/RepoCard'
import { Plus, Search, Radar } from 'lucide-react'
import { Repository, WorkflowExecution } from '@/lib/types'
import toast from 'react-hot-toast'

function getRunningWorkflowForRepo(repoName: string, workflows: WorkflowExecution[]): WorkflowExecution | null {
  return workflows.find(w =>
    w.status.toLowerCase() === 'running' &&
    w.workflowId.includes(repoName)
  ) || null
}

export default function RepositoriesPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newRepo, setNewRepo] = useState({
    name: '',
    url: '',
    source: 'GitHub' as 'GitHub' | 'CodeCommit'
  })

  const { data: repos, isLoading } = useRepos()
  const addRepo = useAddRepo()
  const updateRepo = useUpdateRepo()
  const deleteRepo = useDeleteRepo()
  const discover = useDiscoverRepos()
  const triggerSingle = useTriggerSingle()
  const { data: workflowsData } = useWorkflows(50)

  const runningWorkflows = (workflowsData?.executions || []).filter(
    (w: WorkflowExecution) => w.status.toLowerCase() === 'running'
  )

  const filteredRepos = (repos || []).filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addRepo.mutateAsync({ ...newRepo, enabled: true })
      toast.success(`Repository ${newRepo.name} added successfully`)
      setNewRepo({ name: '', url: '', source: 'GitHub' })
      setShowAddForm(false)
    } catch {
      toast.error('Failed to add repository')
    }
  }

  const handleToggleRepo = async (repo: Repository) => {
    try {
      await updateRepo.mutateAsync({ name: repo.name, updates: { enabled: !repo.enabled } })
      toast.success(`Repository ${repo.name} ${!repo.enabled ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update repository')
    }
  }

  const handleDeleteRepo = async (repo: Repository) => {
    if (!confirm(`Are you sure you want to delete ${repo.name}?`)) return
    try {
      await deleteRepo.mutateAsync(repo.name)
      toast.success(`Repository ${repo.name} deleted successfully`)
    } catch {
      toast.error('Failed to delete repository')
    }
  }

  const handleTriggerRepo = async (repo: Repository) => {
    await triggerSingle.mutateAsync({ repoName: repo.name })
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold pl-10 lg:pl-0">Repositories</h2>
            <span className="text-sm text-muted-foreground">
              {repos?.length || 0} total · {repos?.filter(r => r.enabled).length || 0} enabled
              {runningWorkflows.length > 0 && (
                <span className="ml-2 text-yellow-500">· {runningWorkflows.length} investigating</span>
              )}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => discover.mutate({})}
                disabled={discover.isPending}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                <Radar className={`h-4 w-4 ${discover.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{discover.isPending ? 'Discovering...' : 'Auto-Discover'}</span>

              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Repo</span>
              </button>
            </div>
          </div>
        </div>

        {discover.data && (
          <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg text-sm">
            <span className="font-medium text-amber-400">Discovery complete:</span>{' '}
            Found {discover.data.discovered} repos — {discover.data.added > 0
              ? <span className="text-green-400">{discover.data.added} added</span>
              : 'all already tracked'}
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddRepo} className="bg-background p-4 rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Repository Name" value={newRepo.name}
                onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
              <input type="text" placeholder="Repository URL" value={newRepo.url}
                onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
                className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
              <div className="flex gap-2">
                <select value={newRepo.source} onChange={(e) => setNewRepo({ ...newRepo, source: e.target.value as any })}
                  className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="GitHub">GitHub</option>
                  <option value="CodeCommit">CodeCommit</option>
                </select>
                <button type="submit" disabled={addRepo.isPending}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50">
                  {addRepo.isPending ? '...' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">Cancel</button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading repositories...</div>
        ) : filteredRepos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery ? 'No repositories match your search' : (
              <div className="space-y-3">
                <p>No repositories configured</p>
                <button onClick={() => discover.mutate({})} disabled={discover.isPending}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center gap-2">
                  <Radar className="h-4 w-4" />Auto-Discover
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredRepos.map(repo => (
            <RepoCard
              key={repo.name}
              repo={repo}
              onToggle={handleToggleRepo}
              onDelete={handleDeleteRepo}
              onTrigger={handleTriggerRepo}
              triggerPending={triggerSingle.isPending}
              runningWorkflow={getRunningWorkflowForRepo(repo.name, runningWorkflows)}
            />
          ))
        )}
      </div>
    </div>
  )
}

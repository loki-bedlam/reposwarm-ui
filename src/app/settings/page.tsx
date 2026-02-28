'use client'

import { useQuery } from '@tanstack/react-query'
import { Settings, Cpu, GitBranch, Users, ExternalLink } from 'lucide-react'
import { RepoSwarmConfig, SystemHealth } from '@/lib/types'
import { apiFetchJson } from '@/lib/api'

export default function SettingsPage() {
  const { data: config } = useQuery<RepoSwarmConfig>({
    queryKey: ['config'],
    queryFn: () => apiFetchJson<RepoSwarmConfig>('/config')
  })

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['health'],
    queryFn: () => apiFetchJson<SystemHealth>('/health')
  })

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Model Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Default Model</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.defaultModel || 'us.anthropic.claude-sonnet-4-6'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Token Limit</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.tokenLimit?.toLocaleString() || '200,000'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Workflow Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Chunk Size</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">{config?.chunkSize || 10} files per chunk</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Sleep Duration</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">{config?.sleepDuration || 2000}ms between chunks</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Parallel Limit</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">{config?.parallelLimit || 3} concurrent repos</div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Worker Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Connected Workers</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">{health?.worker?.count || 0} active</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Task Queue</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm">{health?.temporal?.taskQueue || 'investigate-task-queue'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Namespace</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">{health?.temporal?.namespace || 'default'}</div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Environment</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">AWS Region</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">us-east-1</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">DynamoDB Table</label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">reposwarm-cache</div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { apiFetch } from '@/lib/api'

import { useQuery } from '@tanstack/react-query'
import { Settings, Cpu, GitBranch, Users, ExternalLink } from 'lucide-react'
import { RepoSwarmConfig, SystemHealth } from '@/lib/types'

export default function SettingsPage() {
  const { data: config } = useQuery<RepoSwarmConfig>({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await apiFetch('/config')
      return response.json()
    }
  })

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiFetch('/health')
      return response.json()
    }
  })

  return (
    <div className="space-y-6">
      {/* Model Configuration */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Model Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Default Model
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.defaultModel || 'us.anthropic.claude-sonnet-4-6'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Token Limit
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.tokenLimit?.toLocaleString() || '200,000'}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Configuration */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Workflow Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Chunk Size
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.chunkSize || 10} files per chunk
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Sleep Duration
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.sleepDuration || 2000}ms between chunks
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Parallel Limit
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {config?.parallelLimit || 3} concurrent repos
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Schedule Expression
          </label>
          <div className="px-4 py-2 bg-background border border-border rounded-lg">
            {config?.scheduleExpression || 'rate(6 hours)'}
          </div>
        </div>
      </div>

      {/* Architecture Hub */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Architecture Hub</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Repository
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2 bg-background border border-border rounded-lg">
                codecommit://arch-hub
              </div>
              <a
                href="#"
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="View repository"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Last Push
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Worker Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Worker Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Connected Workers
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {health?.worker.count || 0} active
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Task Queue
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm">
              {health?.temporal.taskQueue || 'investigate-task-queue'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Namespace
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {health?.temporal.namespace || 'default'}
            </div>
          </div>
        </div>
      </div>

      {/* Environment Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Environment</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              AWS Region
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              {process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              DynamoDB Table
            </label>
            <div className="px-4 py-2 bg-background border border-border rounded-lg">
              reposwarm-cache
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
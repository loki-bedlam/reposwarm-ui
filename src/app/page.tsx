'use client'

import { useQuery } from '@tanstack/react-query'
import { GitBranch, Activity, CheckCircle, XCircle, Zap } from 'lucide-react'
import { apiFetchJson, apiFetch } from '@/lib/api'
import { StatsCard } from '@/components/StatsCard'
import { StatusBadge } from '@/components/StatusBadge'
import { DataTable } from '@/components/DataTable'
import { formatDate, formatDuration } from '@/lib/utils'
import { useTriggerDaily } from '@/hooks/useTrigger'
import { useRouter } from 'next/navigation'
import { DashboardStats, SystemHealth, WorkflowExecution, Repository } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const triggerDaily = useTriggerDaily()

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [workflows, repos] = await Promise.all([
        apiFetchJson<{ executions: WorkflowExecution[] }>('/workflows?pageSize=100'),
        apiFetchJson<Repository[]>('/repos')
      ])

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayWorkflows = workflows.executions?.filter((w: WorkflowExecution) =>
        new Date(w.startTime) >= today
      ) || []

      return {
        totalRepos: repos.length,
        activeRuns: workflows.executions?.filter((w: WorkflowExecution) =>
          w.status === 'Running'
        ).length || 0,
        completedToday: todayWorkflows.filter((w: WorkflowExecution) =>
          w.status === 'Completed'
        ).length,
        failedToday: todayWorkflows.filter((w: WorkflowExecution) =>
          w.status === 'Failed'
        ).length
      }
    }
  })

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiFetch('/health')
      return response.json()
    }
  })

  const { data: recentWorkflows } = useQuery({
    queryKey: ['recent-workflows'],
    queryFn: async () => {
      const response = await apiFetch('/workflows?pageSize=10')
      const data = await response.json()
      return data.executions || []
    }
  })

  const handleRunDaily = () => {
    triggerDaily.mutate(undefined)
  }

  const columns = [
    {
      key: 'workflowId',
      header: 'Workflow ID',
      sortable: true,
      className: 'font-mono text-xs'
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row: WorkflowExecution) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      key: 'startTime',
      header: 'Started',
      accessor: (row: WorkflowExecution) => formatDate(row.startTime),
      sortable: true
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (row: WorkflowExecution) =>
        row.duration ? formatDuration(row.duration) : '-'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Repositories"
          value={stats?.totalRepos || 0}
          icon={GitBranch}
          description="Tracked repositories"
        />
        <StatsCard
          title="Active Runs"
          value={stats?.activeRuns || 0}
          icon={Activity}
          iconColor="text-yellow-500"
          iconBg="bg-yellow-500/10"
          description="Currently running"
        />
        <StatsCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          icon={CheckCircle}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
          description="Successfully finished"
        />
        <StatsCard
          title="Failed Today"
          value={stats?.failedToday || 0}
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
          description="Encountered errors"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleRunDaily}
            disabled={triggerDaily.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Zap className="inline-block h-4 w-4 mr-2" />
            {triggerDaily.isPending ? 'Triggering...' : 'Run Daily Investigation'}
          </button>
          <button
            onClick={() => router.push('/triggers')}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Investigate Single Repo
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${health?.temporal.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <p className="font-medium">Temporal Server</p>
              <p className="text-sm text-muted-foreground">
                {health?.temporal.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${health?.worker.connected ? 'bg-green-500' : 'bg-orange-500'}`} />
            <div>
              <p className="font-medium">Workers</p>
              <p className="text-sm text-muted-foreground">
                {health?.worker.count || 0} connected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${health?.api === 'healthy' ? 'bg-green-500' : 'bg-orange-500'}`} />
            <div>
              <p className="font-medium">API Status</p>
              <p className="text-sm text-muted-foreground capitalize">
                {health?.api || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <DataTable
          columns={columns}
          data={recentWorkflows || []}
          onRowClick={(row) => router.push(`/workflows/${row.workflowId}`)}
          emptyMessage="No recent workflow activity"
        />
      </div>
    </div>
  )
}
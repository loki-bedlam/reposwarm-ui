'use client'

import { useQuery } from '@tanstack/react-query'
import { Server, Cpu, HardDrive, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetchJson } from '@/lib/api'
import type { InfrastructureData, EcsServiceInfo } from '@/lib/types'
import { formatDuration } from '@/lib/utils'

function formatCpu(units: number): string {
  if (!units) return '—'
  return units >= 1024 ? `${(units / 1024).toFixed(units % 1024 === 0 ? 0 : 1)} vCPU` : `${units} units`
}

function formatMemory(mib: number): string {
  if (!mib) return '—'
  return mib >= 1024 ? `${(mib / 1024).toFixed(mib % 1024 === 0 ? 0 : 1)} GB` : `${mib} MB`
}

function ServiceRow({ svc }: { svc: EcsServiceInfo }) {
  const healthy = svc.running >= svc.desired && svc.desired > 0
  const degraded = svc.running > 0 && svc.running < svc.desired
  const down = svc.running === 0 && svc.desired > 0

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-3 rounded-lg border',
      down ? 'border-red-500/30 bg-red-500/5' :
      degraded ? 'border-amber-500/30 bg-amber-500/5' :
      'border-border bg-card/50'
    )}>
      {/* Status dot */}
      <div className={cn(
        'h-2.5 w-2.5 rounded-full shrink-0',
        healthy ? 'bg-green-500' :
        degraded ? 'bg-amber-500' :
        down ? 'bg-red-500' :
        'bg-gray-500'
      )} />

      {/* Service name */}
      <div className="min-w-[100px]">
        <span className="text-sm font-medium">{svc.displayName}</span>
      </div>

      {/* Running / Desired */}
      <div className="flex items-center gap-1.5 min-w-[80px]">
        <Server className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={cn(
          'text-sm font-mono tabular-nums',
          healthy ? 'text-green-400' :
          degraded ? 'text-amber-400' :
          down ? 'text-red-400' :
          'text-muted-foreground'
        )}>
          {svc.running}/{svc.desired}
        </span>
        {svc.pending > 0 && (
          <span className="text-xs text-amber-400 ml-1">+{svc.pending} pending</span>
        )}
      </div>

      {/* CPU */}
      <div className="flex items-center gap-1.5 min-w-[70px]">
        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{formatCpu(svc.cpu)}</span>
      </div>

      {/* Memory */}
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{formatMemory(svc.memory)}</span>
      </div>

      {/* Architecture */}
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded font-mono',
        svc.arch === 'ARM64'
          ? 'bg-purple-500/15 text-purple-400'
          : 'bg-gray-500/15 text-gray-400'
      )}>
        {svc.arch === 'ARM64' ? 'arm64' : 'x86'}
      </span>

      {/* Deployment status */}
      <span className="text-xs text-muted-foreground ml-auto">
        {svc.deploymentStatus === 'COMPLETED' ? '✓ deployed' :
         svc.deploymentStatus === 'IN_PROGRESS' ? '⟳ deploying...' :
         svc.deploymentStatus || ''}
      </span>
    </div>
  )
}

export function InfrastructurePanel() {
  const { data, isLoading } = useQuery<InfrastructureData>({
    queryKey: ['infrastructure'],
    queryFn: () => apiFetchJson<InfrastructureData>('/infrastructure'),
    refetchInterval: 30_000, // refresh every 30s
  })

  // Not on ECS or no data yet
  if (!data || data.source === 'unavailable') return null

  const services = data.services || []
  if (services.length === 0) return null

  const totalRunning = services.reduce((s, svc) => s + svc.running, 0)
  const totalDesired = services.reduce((s, svc) => s + svc.desired, 0)
  const allHealthy = totalRunning === totalDesired && totalDesired > 0
  const workerSvc = services.find((s) => s.name.includes('worker'))

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Infrastructure</h2>
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-2 w-2 rounded-full',
            allHealthy ? 'bg-green-500' : 'bg-amber-500'
          )} />
          <span className="text-sm text-muted-foreground">
            {totalRunning}/{totalDesired} tasks running
          </span>
          {workerSvc && (
            <span className="text-xs text-muted-foreground ml-2">
              · {workerSvc.running} worker{workerSvc.running !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {services.map((svc) => (
          <ServiceRow key={svc.name} svc={svc} />
        ))}
      </div>

      {data.source === 'error' && (
        <p className="text-xs text-red-400 mt-3">Failed to fetch ECS data: {data.error}</p>
      )}
    </div>
  )
}

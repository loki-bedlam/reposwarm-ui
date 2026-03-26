export type WorkflowStatus = 'Running' | 'Completed' | 'Failed' | 'Terminated' | 'TimedOut' | 'Canceled'
export type WorkflowType = 'single' | 'multi' | 'daily'

export interface WorkflowExecution {
  workflowId: string
  runId: string
  type: WorkflowType
  status: WorkflowStatus
  startTime: string
  closeTime?: string
  duration?: number
  repoCount?: number
  taskQueueName: string
  input?: any
  result?: any
  memo?: Record<string, any>
  stale: boolean
  startedAgo: string
  failure?: {
    message: string
    source?: string
    stackTrace?: string
    cause?: any
  }
}

export interface WorkflowHistory {
  events: WorkflowEvent[]
}

export interface WorkflowEvent {
  eventId: string
  eventTime: string
  eventType: string
  details?: any
}

export interface EcsServiceInfo {
  name: string
  displayName: string
  desired: number
  running: number
  pending: number
  status: string
  cpu: number
  memory: number
  arch: string
  lastDeployment?: string
  deploymentStatus?: string
}

export interface InfrastructureData {
  services: EcsServiceInfo[]
  source: 'ecs' | 'unavailable' | 'error'
  error?: string
}

export interface Repository {
  name: string
  url: string
  source: 'GitHub' | 'CodeCommit'
  lastAnalyzed?: string
  lastCommit?: string
  enabled: boolean
  status?: 'active' | 'inactive' | 'error'
  architectureDoc?: string
  hasDocs?: boolean
}

export interface TriggerRequest {
  repoName?: string
  repos?: string[]
  chunkSize?: number
  model?: string
}

export interface DashboardStats {
  totalRepos: number
  activeRuns: number
  completedToday: number
  failedToday: number
}

export interface SystemHealth {
  temporal: {
    connected: boolean
    namespace: string
    taskQueue: string
  }
  worker: {
    connected: boolean
    count: number
  }
  api: 'healthy' | 'degraded' | 'error'
}

export interface RepoSwarmConfig {
  defaultModel: string
  chunkSize: number
  sleepDuration: number
  parallelLimit: number
  tokenLimit: number
  scheduleExpression: string
}
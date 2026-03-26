import { Client, Connection, WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { WorkflowExecution, WorkflowHistory } from './types'
import { logger } from './logger'
import { formatDuration } from './utils'

const TEMPORAL_SERVER_URL = process.env.TEMPORAL_SERVER_URL || 'reposwarm-temporal-nlb-11f3aaedbbea9cf1.elb.us-east-1.amazonaws.com:7233'
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'default'
const TEMPORAL_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || 'investigate-task-queue'

// HTTP URL for read-only operations (list, get, history) via Temporal UI proxy
const TEMPORAL_HTTP_URL = process.env.TEMPORAL_HTTP_URL || 'http://reposwarm-temporal-nlb-11f3aaedbbea9cf1.elb.us-east-1.amazonaws.com:8233'


function normalizeStatus(status: string): string {
  if (!status) return 'unknown'
  // WORKFLOW_EXECUTION_STATUS_RUNNING -> Running
  const cleaned = status.replace('WORKFLOW_EXECUTION_STATUS_', '')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

let _client: Client | null = null

async function getClient(): Promise<Client> {
  if (_client) return _client
  const connection = await Connection.connect({ address: TEMPORAL_SERVER_URL })
  _client = new Client({ connection, namespace: TEMPORAL_NAMESPACE })
  logger.info('Connected to Temporal gRPC', { address: TEMPORAL_SERVER_URL, namespace: TEMPORAL_NAMESPACE })
  return _client
}

export class TemporalClient {
  private namespace: string
  private taskQueue: string
  private httpUrl: string

  constructor() {
    this.namespace = TEMPORAL_NAMESPACE
    this.taskQueue = TEMPORAL_TASK_QUEUE
    this.httpUrl = TEMPORAL_HTTP_URL
  }

  async listWorkflows(pageSize = 25, nextPageToken?: string): Promise<{
    executions: WorkflowExecution[]
    nextPageToken?: string
  }> {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      ...(nextPageToken && { nextPageToken })
    })
    const response = await fetch(
      `${this.httpUrl}/api/v1/namespaces/${this.namespace}/workflows?${params}`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    if (!response.ok) throw new Error(`Failed to list workflows: ${response.statusText}`)
    const data = await response.json()
    return {
      executions: (data.executions || []).map((exec: any) => this.mapExecution(exec)),
      nextPageToken: data.nextPageToken
    }
  }

  async getWorkflow(workflowId: string, runId?: string): Promise<WorkflowExecution> {
    const url = runId
      ? `${this.httpUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/runs/${runId}`
      : `${this.httpUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}`
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error(`Failed to get workflow: ${response.statusText}`)
    const data = await response.json()
    return this.mapExecution(data.workflowExecutionInfo)
  }

  async getWorkflowHistory(workflowId: string, runId?: string): Promise<WorkflowHistory> {
    const url = runId
      ? `${this.httpUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/runs/${runId}/history`
      : `${this.httpUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/history`
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error(`Failed to get workflow history: ${response.statusText}`)
    const data = await response.json()
    return {
      events: (data.events || []).map((e: any) => ({
        eventId: e.eventId,
        eventTime: e.eventTime,
        eventType: this.normalizeEventType(e.eventType),
        details: this.extractEventDetails(e)
      }))
    }
  }

  async terminateWorkflow(workflowId: string, runId?: string, reason?: string): Promise<void> {
    const client = await getClient()
    const handle = client.workflow.getHandle(workflowId, runId)
    await handle.terminate(reason || 'Terminated via UI')
  }

  async startWorkflow(
    workflowId: string,
    workflowType: string,
    input: any
  ): Promise<{ workflowId: string; runId: string }> {
    const client = await getClient()
    try {
      const handle = await client.workflow.start(workflowType, {
        taskQueue: this.taskQueue,
        workflowId,
        args: [input]
      })
      return { workflowId: handle.workflowId, runId: handle.firstExecutionRunId }
    } catch (err) {
      if (err instanceof WorkflowExecutionAlreadyStartedError) {
        throw new Error(`Workflow ${workflowId} is already running`)
      }
      throw err
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const client = await getClient()
      const workflows = client.workflow.list({ pageSize: 1 })
      for await (const _wf of workflows) { break }
      return true
    } catch {
      try {
        const response = await fetch(`${this.httpUrl}/api/v1/system-info`, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
        })
        return response.ok
      } catch {
        return false
      }
    }
  }

  private mapExecution(exec: any): WorkflowExecution {
    const type = this.inferWorkflowType(exec.type?.name || '')
    const startTime = exec.startTime || new Date().toISOString()
    const startMs = new Date(startTime).getTime()
    const nowMs = Date.now()
    const agoMs = nowMs - startMs
    const status = normalizeStatus(exec.status || 'Running') as any

    // A workflow is stale if it's been running for more than 24 hours
    const stale = status === 'Running' && agoMs > 24 * 60 * 60 * 1000

    return {
      workflowId: exec.execution?.workflowId || '',
      runId: exec.execution?.runId || '',
      type,
      status,
      startTime,
      closeTime: exec.closeTime,
      duration: exec.closeTime
        ? new Date(exec.closeTime).getTime() - startMs
        : undefined,
      taskQueueName: exec.taskQueue?.name || this.taskQueue,
      input: exec.input,
      result: exec.result,
      memo: exec.memo,
      stale,
      startedAgo: formatDuration(agoMs),
    }
  }

  private normalizeEventType(eventType: string): string {
    if (!eventType) return eventType
    // Already PascalCase (no underscores) — pass through
    if (!eventType.includes('_')) return eventType
    // EVENT_TYPE_ACTIVITY_TASK_FAILED -> ActivityTaskFailed
    const cleaned = eventType.replace('EVENT_TYPE_', '')
    return cleaned
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  }

  private extractEventDetails(event: any): any {
    // Find the event-specific attributes key (e.g. activityTaskFailedEventAttributes)
    const attrKey = Object.keys(event).find((k) => k.endsWith('EventAttributes'))
    const attrs = attrKey ? event[attrKey] : undefined
    if (!attrs || typeof attrs !== 'object') return undefined
    return attrs
  }

  private inferWorkflowType(workflowName: string): 'single' | 'multi' | 'daily' {
    if (workflowName?.includes('Single')) return 'single'
    if (workflowName?.includes('Daily')) return 'daily'
    return 'multi'
  }
}

export const temporalClient = new TemporalClient()

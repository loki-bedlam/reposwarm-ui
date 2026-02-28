import { WorkflowExecution, WorkflowHistory } from './types'

const TEMPORAL_HTTP_URL = process.env.TEMPORAL_HTTP_URL || 'http://temporal-alb-internal:8233'
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'default'
const TEMPORAL_TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || 'investigate-task-queue'

export class TemporalClient {
  private baseUrl: string
  private namespace: string
  private taskQueue: string

  constructor() {
    this.baseUrl = TEMPORAL_HTTP_URL
    this.namespace = TEMPORAL_NAMESPACE
    this.taskQueue = TEMPORAL_TASK_QUEUE
  }

  async listWorkflows(pageSize = 25, nextPageToken?: string): Promise<{
    executions: WorkflowExecution[]
    nextPageToken?: string
  }> {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      ...(nextPageToken && { nextPageToken })
    })

    // Temporal UI proxy uses /workflows for listing (not /workflow-executions)
    const response = await fetch(
      `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows?${params}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to list workflows: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      executions: (data.executions || []).map((exec: any) => this.mapExecution(exec)),
      nextPageToken: data.nextPageToken
    }
  }

  async getWorkflow(workflowId: string, runId?: string): Promise<WorkflowExecution> {
    const url = runId
      ? `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/runs/${runId}`
      : `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get workflow: ${response.statusText}`)
    }

    const data = await response.json()
    return this.mapExecution(data.workflowExecutionInfo)
  }

  async getWorkflowHistory(workflowId: string, runId?: string): Promise<WorkflowHistory> {
    const url = runId
      ? `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/runs/${runId}/history`
      : `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/history`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get workflow history: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      events: (data.events || []).map((e: any) => ({
        eventId: e.eventId,
        eventTime: e.eventTime,
        eventType: e.eventType,
        details: e
      }))
    }
  }

  async terminateWorkflow(workflowId: string, runId?: string, reason?: string): Promise<void> {
    const url = runId
      ? `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/runs/${runId}/terminate`
      : `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows/${workflowId}/terminate`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Temporal-Csrf-Token': 'nocheck'
      },
      body: JSON.stringify({
        reason: reason || 'Terminated via UI'
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to terminate workflow: ${response.statusText}`)
    }
  }

  async startWorkflow(
    workflowId: string,
    workflowType: string,
    input: any
  ): Promise<{ workflowId: string; runId: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Temporal-Csrf-Token': 'nocheck'
        },
        body: JSON.stringify({
          workflowId,
          workflowType: {
            name: workflowType
          },
          taskQueue: {
            name: this.taskQueue
          },
          input: {
            payloads: [
              {
                metadata: {
                  encoding: 'anNvbi9wbGFpbg==' // base64 for 'json/plain'
                },
                data: Buffer.from(JSON.stringify(input)).toString('base64')
              }
            ]
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to start workflow: ${error}`)
    }

    const data = await response.json()
    return {
      workflowId: data.workflowId,
      runId: data.runId
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Try system-info first (native HTTP API)
      const response = await fetch(`${this.baseUrl}/api/v1/system-info`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (response.ok) return true

      // Fallback: try listing workflows (works through temporal-ui proxy)
      const fallback = await fetch(
        `${this.baseUrl}/api/v1/namespaces/${this.namespace}/workflows?pageSize=1`,
        { headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) }
      )
      return fallback.ok
    } catch {
      return false
    }
  }

  private mapExecution(exec: any): WorkflowExecution {
    const type = this.inferWorkflowType(exec.type?.name || '')
    return {
      workflowId: exec.execution?.workflowId || '',
      runId: exec.execution?.runId || '',
      type,
      status: exec.status || 'Running',
      startTime: exec.startTime || new Date().toISOString(),
      closeTime: exec.closeTime,
      duration: exec.closeTime
        ? new Date(exec.closeTime).getTime() - new Date(exec.startTime).getTime()
        : undefined,
      taskQueueName: exec.taskQueue?.name || this.taskQueue,
      input: exec.input,
      result: exec.result,
      memo: exec.memo
    }
  }

  private inferWorkflowType(workflowName: string): 'single' | 'multi' | 'daily' {
    if (workflowName?.includes('Single')) return 'single'
    if (workflowName?.includes('Daily')) return 'daily'
    return 'multi'
  }
}

export const temporalClient = new TemporalClient()
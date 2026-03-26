import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

const TEMPORAL_HEALTH_API = process.env.TEMPORAL_HEALTH_API || 'https://zshclevi8i.execute-api.us-east-1.amazonaws.com/prod/health'

function normalizeStatus(status: string): string {
  if (!status) return 'Running'
  // WORKFLOW_EXECUTION_STATUS_RUNNING -> Running
  const cleaned = status.replace('WORKFLOW_EXECUTION_STATUS_', '')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pageSize = parseInt(searchParams.get('pageSize') || '25')

    // Get workflows from the health Lambda (which fetches up to 100)
    const response = await fetch(TEMPORAL_HEALTH_API, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Health API returned ${response.status}`)
    }

    const data = await response.json()
    const allExecutions = data.workflows?.executions || []

    // Map Temporal API format to our UI format
    const executions = allExecutions.slice(0, pageSize).map((exec: any) => ({
      workflowId: exec.execution?.workflowId || '',
      runId: exec.execution?.runId || '',
      type: inferWorkflowType(exec.type?.name || ''),
      status: normalizeStatus(exec.status || 'Running'),
      startTime: exec.startTime || new Date().toISOString(),
      closeTime: exec.closeTime,
      duration: exec.closeTime
        ? new Date(exec.closeTime).getTime() - new Date(exec.startTime).getTime()
        : undefined,
      taskQueueName: exec.taskQueue || 'investigate-task-queue',
    }))

    return NextResponse.json({
      executions,
      nextPageToken: undefined
    })
  } catch (error) {
    logger.error('Error listing workflows:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    )
  }
}

function inferWorkflowType(name: string): 'single' | 'multi' | 'daily' {
  if (name?.includes('Single')) return 'single'
  if (name?.includes('Daily')) return 'daily'
  return 'multi'
}

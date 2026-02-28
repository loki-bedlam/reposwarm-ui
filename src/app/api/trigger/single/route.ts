import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repoName, model, chunkSize } = body

    if (!repoName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      )
    }

    const workflowId = `investigate-single-${repoName}-${Date.now()}`

    const result = await temporalClient.startWorkflow(
      workflowId,
      'InvestigateSingleRepoWorkflow',
      {
        repoName,
        model: model || 'us.anthropic.claude-sonnet-4-6',
        chunkSize: chunkSize || 10
      }
    )

    return NextResponse.json({
      success: true,
      workflowId: result.workflowId,
      runId: result.runId,
      repoName
    })
  } catch (error) {
    logger.error('Error triggering single investigation:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to trigger investigation' },
      { status: 500 }
    )
  }
}
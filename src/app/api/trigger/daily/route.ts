import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'
import { dynamoService } from '@/lib/dynamodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repos, model, chunkSize, parallelLimit } = body

    let repoList = repos
    if (!repoList || repoList.length === 0) {
      // Get all enabled repos from DynamoDB
      const allRepos = await dynamoService.listRepos()
      repoList = allRepos
        .filter(r => r.enabled)
        .map(r => r.name)
    }

    if (repoList.length === 0) {
      return NextResponse.json(
        { error: 'No repositories to investigate' },
        { status: 400 }
      )
    }

    const workflowId = `investigate-daily-${Date.now()}`

    const result = await temporalClient.startWorkflow(
      workflowId,
      'InvestigateReposWorkflow',
      {
        repos: repoList,
        model: model || 'us.anthropic.claude-sonnet-4-6',
        chunkSize: chunkSize || 10,
        parallelLimit: parallelLimit || 3
      }
    )

    return NextResponse.json({
      success: true,
      workflowId: result.workflowId,
      runId: result.runId,
      repoCount: repoList.length
    })
  } catch (error) {
    logger.error('Error triggering daily investigation:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to trigger daily investigation' },
      { status: 500 }
    )
  }
}
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const runId = searchParams.get('runId') || undefined

    const workflow = await temporalClient.getWorkflow(params.id, runId)

    return NextResponse.json(workflow)
  } catch (error) {
    logger.error('Error getting workflow:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to get workflow' },
      { status: 500 }
    )
  }
}
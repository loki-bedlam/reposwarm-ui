import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { runId, reason } = body

    await temporalClient.terminateWorkflow(id, runId, reason)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error terminating workflow:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to terminate workflow' },
      { status: 500 }
    )
  }
}

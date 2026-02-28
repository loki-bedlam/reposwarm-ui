import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const pageToken = searchParams.get('pageToken') || undefined

    const result = await temporalClient.listWorkflows(pageSize, pageToken)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error listing workflows:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    )
  }
}
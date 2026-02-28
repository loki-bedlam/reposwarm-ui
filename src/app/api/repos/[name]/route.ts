import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { dynamoService } from '@/lib/dynamodb'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const body = await request.json()
    const decodedName = decodeURIComponent(params.name)

    await dynamoService.updateRepo(decodedName, body)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error updating repo:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to update repository' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const decodedName = decodeURIComponent(params.name)

    await dynamoService.deleteRepo(decodedName)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting repo:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to delete repository' },
      { status: 500 }
    )
  }
}
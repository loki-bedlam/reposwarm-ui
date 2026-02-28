import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { dynamoService } from '@/lib/dynamodb'
import { Repository } from '@/lib/types'

export async function GET() {
  try {
    const repos = await dynamoService.listRepos()
    return NextResponse.json(repos)
  } catch (error) {
    logger.error('Error listing repos:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to list repositories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<Repository>

    if (!body.name || !body.url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      )
    }

    const repo: Repository = {
      name: body.name,
      url: body.url,
      source: body.source || 'GitHub',
      enabled: body.enabled !== false,
      status: 'active',
      ...body
    }

    await dynamoService.addRepo(repo)

    return NextResponse.json({ success: true, repo })
  } catch (error) {
    logger.error('Error adding repo:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to add repository' },
      { status: 500 }
    )
  }
}
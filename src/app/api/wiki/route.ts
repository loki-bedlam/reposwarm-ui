import { NextResponse } from 'next/server'
import { dynamoService } from '@/lib/dynamodb'
import { logger } from '@/lib/logger'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(client)
const TABLE = process.env.DYNAMODB_CACHE_TABLE || 'reposwarm-cache'

// Key findings sections to highlight
const HIGHLIGHT_SECTIONS = ['hl_overview', 'security_check', 'DBs', 'APIs', 'deployment', 'dependencies']

export async function GET() {
  try {
    // Scan for all _result_ entries
    let items: Record<string, any>[] = []
    let lastKey: Record<string, any> | undefined

    do {
      const command = new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'begins_with(repository_name, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': '_result_'
        },
        ProjectionExpression: 'repository_name, analysis_timestamp, created_at, step_name',
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {})
      })

      const response = await docClient.send(command)
      items = items.concat(response.Items || [])
      lastKey = response.LastEvaluatedKey
    } while (lastKey)

    // Group by repo name
    const repoMap = new Map<string, { sections: Set<string>, lastUpdated: string, highlights: string[] }>()

    // Get all known repo names for matching
    const allRepos = await dynamoService.listRepos()
    const repoNames = allRepos.map(r => r.name)

    for (const item of items) {
      const fullKey = item.repository_name as string
      // Match against known repo names
      let matchedRepo: string | null = null
      for (const name of repoNames) {
        if (fullKey.startsWith(`_result_${name}_`)) {
          matchedRepo = name
          break
        }
      }
      if (!matchedRepo) continue

      if (!repoMap.has(matchedRepo)) {
        repoMap.set(matchedRepo, { sections: new Set(), lastUpdated: '', highlights: [] })
      }

      const entry = repoMap.get(matchedRepo)!
      const stepName = item.step_name as string || ''
      entry.sections.add(stepName)

      const createdAt = item.created_at as string || ''
      if (createdAt > entry.lastUpdated) {
        entry.lastUpdated = createdAt
      }
    }

    // Build response sorted by lastUpdated descending
    const repos = Array.from(repoMap.entries())
      .map(([name, data]) => {
        // Pick highlights from key sections
        const highlights: string[] = []
        for (const section of HIGHLIGHT_SECTIONS) {
          if (data.sections.has(section)) {
            const label = section
              .replace('hl_', '')
              .replace('_', ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
            highlights.push(label)
          }
        }
        return {
          name,
          sectionCount: data.sections.size,
          lastUpdated: data.lastUpdated,
          highlights: highlights.slice(0, 4)
        }
      })
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))

    return NextResponse.json({ repos })
  } catch (error) {
    logger.error('Error listing wiki repos:', { error: String(error) })
    return NextResponse.json({ error: 'Failed to list wiki repos' }, { status: 500 })
  }
}

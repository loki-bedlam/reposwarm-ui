import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { CodeCommitClient, ListRepositoriesCommand, GetRepositoryCommand } from '@aws-sdk/client-codecommit'
import { dynamoService } from '@/lib/dynamodb'
import { Repository } from '@/lib/types'

const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const codecommit = new CodeCommitClient({ region: AWS_REGION })

export async function POST() {
  try {
    // List all CodeCommit repositories
    const discovered: Repository[] = []
    let nextToken: string | undefined

    do {
      const listCommand = new ListRepositoriesCommand({
        nextToken,
        sortBy: 'repositoryName',
        order: 'ascending'
      })
      const listResponse = await codecommit.send(listCommand)

      for (const repo of listResponse.repositories || []) {
        if (!repo.repositoryName) continue

        try {
          const detailCommand = new GetRepositoryCommand({
            repositoryName: repo.repositoryName
          })
          const detailResponse = await codecommit.send(detailCommand)
          const metadata = detailResponse.repositoryMetadata

          discovered.push({
            name: repo.repositoryName,
            url: metadata?.cloneUrlHttp || `codecommit://${repo.repositoryName}`,
            source: 'CodeCommit',
            lastCommit: metadata?.lastModifiedDate?.toISOString(),
            enabled: true,
            status: 'active'
          })
        } catch (err) {
          logger.warn('Failed to get repo details:', { repo: repo.repositoryName, error: String(err) })
          discovered.push({
            name: repo.repositoryName,
            url: `codecommit://${repo.repositoryName}`,
            source: 'CodeCommit',
            enabled: true,
            status: 'active'
          })
        }
      }

      nextToken = listResponse.nextToken
    } while (nextToken)

    // Get existing repos from DynamoDB
    const existing = await dynamoService.listRepos()
    const existingNames = new Set(existing.map(r => r.name))

    // Add new repos (don't overwrite existing ones)
    let added = 0
    let skipped = 0
    for (const repo of discovered) {
      if (existingNames.has(repo.name)) {
        skipped++
        continue
      }
      await dynamoService.addRepo(repo)
      added++
    }

    return NextResponse.json({
      success: true,
      discovered: discovered.length,
      added,
      skipped,
      total: existing.length + added,
      repositories: discovered.map(r => r.name)
    })
  } catch (error) {
    logger.error('Error discovering repos:', { error: String(error) })
    return NextResponse.json(
      { error: 'Failed to discover repositories' },
      { status: 500 }
    )
  }
}

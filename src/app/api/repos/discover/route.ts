import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import { CodeCommitClient, ListRepositoriesCommand, BatchGetRepositoriesCommand } from '@aws-sdk/client-codecommit'
import { dynamoService } from '@/lib/dynamodb'
import { Repository } from '@/lib/types'

const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const codecommit = new CodeCommitClient({ region: AWS_REGION })

export async function POST() {
  try {
    // Step 1: List all repo names (lightweight, no throttling)
    const repoNames: string[] = []
    let nextToken: string | undefined

    do {
      const listResponse = await codecommit.send(new ListRepositoriesCommand({
        nextToken,
        sortBy: 'repositoryName',
        order: 'ascending'
      }))

      for (const repo of listResponse.repositories || []) {
        if (repo.repositoryName) repoNames.push(repo.repositoryName)
      }
      nextToken = listResponse.nextToken
    } while (nextToken)

    // Step 2: Batch get details (25 at a time — API limit)
    const discovered: Repository[] = []
    for (let i = 0; i < repoNames.length; i += 25) {
      const batch = repoNames.slice(i, i + 25)
      try {
        const batchResponse = await codecommit.send(new BatchGetRepositoriesCommand({
          repositoryNames: batch
        }))

        for (const meta of batchResponse.repositories || []) {
          discovered.push({
            name: meta.repositoryName || '',
            url: meta.cloneUrlHttp || `codecommit://${meta.repositoryName}`,
            source: 'CodeCommit',
            lastCommit: meta.lastModifiedDate?.toISOString(),
            enabled: true,
            status: 'active'
          })
        }

        // Also add any that failed to get details
        for (const err of batchResponse.repositoriesNotFound || []) {
          discovered.push({
            name: err,
            url: `codecommit://${err}`,
            source: 'CodeCommit',
            enabled: true,
            status: 'active'
          })
        }
      } catch (err) {
        // Fallback: add without details
        logger.warn('Batch get failed, adding without details:', { batch: batch.join(','), error: String(err) })
        for (const name of batch) {
          discovered.push({
            name,
            url: `codecommit://${name}`,
            source: 'CodeCommit',
            enabled: true,
            status: 'active'
          })
        }
      }
    }

    // Step 3: Get existing and add new
    const existing = await dynamoService.listRepos()
    const existingNames = new Set(existing.map(r => r.name))

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

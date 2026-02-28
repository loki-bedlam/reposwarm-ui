import { logger } from '@/lib/logger'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Repository } from './types'

const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const DYNAMODB_CACHE_TABLE = process.env.DYNAMODB_CACHE_TABLE || 'reposwarm-cache'

const client = new DynamoDBClient({ region: AWS_REGION })
const docClient = DynamoDBDocumentClient.from(client)

export class DynamoDBService {
  private tableName: string

  constructor() {
    this.tableName = DYNAMODB_CACHE_TABLE
  }

  async listRepos(): Promise<Repository[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#sk = :repoMarker',
        ExpressionAttributeNames: {
          '#sk': 'analysis_timestamp'
        },
        ExpressionAttributeValues: {
          ':repoMarker': 0
        }
      })

      const response = await docClient.send(command)

      const repos = (response.Items || []).map(item => ({
        name: item.repository_name || '',
        url: item.url || '',
        source: item.source || 'GitHub',
        lastAnalyzed: item.lastAnalyzed,
        lastCommit: item.lastCommit,
        enabled: item.enabled !== false,
        status: item.status || 'active',
        architectureDoc: item.architectureDoc,
        hasDocs: false
      }))

      // Check which repos have wiki results
      const docsCheck = await this.getReposWithDocs(repos.map(r => r.name))
      for (const repo of repos) {
        repo.hasDocs = docsCheck.has(repo.name)
      }

      return repos
    } catch (error) {
      logger.error('Error listing repos:', { error: String(error) })
      return []
    }
  }

  async getRepo(name: string): Promise<Repository | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          repository_name: name,
          analysis_timestamp: 0
        }
      })

      const response = await docClient.send(command)

      if (!response.Item) {
        return null
      }

      return {
        name: response.Item.repository_name || name,
        url: response.Item.url || '',
        source: response.Item.source || 'GitHub',
        lastAnalyzed: response.Item.lastAnalyzed,
        lastCommit: response.Item.lastCommit,
        enabled: response.Item.enabled !== false,
        status: response.Item.status || 'active',
        architectureDoc: response.Item.architectureDoc
      }
    } catch (error) {
      logger.error('Error getting repo:', { error: String(error) })
      return null
    }
  }

  async addRepo(repo: Repository): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        repository_name: repo.name,
        analysis_timestamp: 0,
        url: repo.url,
        source: repo.source,
        enabled: repo.enabled,
        status: repo.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })

    await docClient.send(command)
  }

  async updateRepo(name: string, updates: Partial<Repository>): Promise<void> {
    const existingRepo = await this.getRepo(name)
    if (!existingRepo) {
      throw new Error('Repository not found')
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        repository_name: name,
        analysis_timestamp: 0,
        ...existingRepo,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    })

    await docClient.send(command)
  }

  async deleteRepo(name: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        repository_name: name,
        analysis_timestamp: 0
      }
    })

    await docClient.send(command)
  }

  async getCacheEntry(key: string): Promise<any> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          repository_name: `CACHE#${key}`,
          analysis_timestamp: 'CACHE'
        }
      })

      const response = await docClient.send(command)
      return response.Item?.data || null
    } catch (error) {
      logger.error('Error getting cache entry:', { error: String(error) })
      return null
    }
  }

  async setCacheEntry(key: string, data: any, ttl?: number): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        repository_name: `CACHE#${key}`,
        analysis_timestamp: 'CACHE',
        data,
        updatedAt: new Date().toISOString(),
        ...(ttl && { TTL: Math.floor(Date.now() / 1000) + ttl })
      }
    })

    await docClient.send(command)
  }
  async getReposWithDocs(repoNames: string[]): Promise<Set<string>> {
    const withDocs = new Set<string>()
    try {
      // Scan for _result_ entries and extract unique repo names
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(repository_name, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': '_result_'
        },
        ProjectionExpression: 'repository_name'
      })

      const response = await docClient.send(command)
      for (const item of response.Items || []) {
        const name = item.repository_name as string
        // _result_{repoName}_{section}_{commit}_{version}
        const parts = name.replace('_result_', '').split('_')
        if (parts.length >= 1) {
          // repo name might contain underscores, so match against known names
          for (const repoName of repoNames) {
            if (name.startsWith(`_result_${repoName}_`)) {
              withDocs.add(repoName)
              break
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error checking docs:', { error: String(error) })
    }
    return withDocs
  }
}


export const dynamoService = new DynamoDBService()

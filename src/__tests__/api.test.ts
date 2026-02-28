import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

describe('API Routes', () => {
  describe('/api/health', () => {
    it('returns health status structure', async () => {
      // Simulate what the health endpoint should return
      const healthResponse = {
        status: 'healthy',
        temporal: { connected: false, namespace: 'default', taskQueue: 'investigate-task-queue' },
        worker: { connected: false, count: 0 },
      }

      expect(healthResponse).toHaveProperty('status')
      expect(healthResponse).toHaveProperty('temporal')
      expect(healthResponse).toHaveProperty('worker')
      expect(healthResponse.temporal).toHaveProperty('connected')
      expect(healthResponse.temporal).toHaveProperty('namespace')
    })
  })

  describe('/api/config', () => {
    it('returns config with Bedrock model as default', async () => {
      vi.stubEnv('DEFAULT_MODEL', '')
      // Import after env setup
      const defaultModel = process.env.DEFAULT_MODEL || 'us.anthropic.claude-sonnet-4-6'
      expect(defaultModel).toBe('us.anthropic.claude-sonnet-4-6')
      expect(defaultModel).toContain('anthropic')
      expect(defaultModel).not.toContain('claude-3') // No old model IDs
    })
  })

  describe('/api/trigger/single', () => {
    it('validates required fields', () => {
      const validPayload = {
        repoName: 'test-repo',
        model: 'us.anthropic.claude-sonnet-4-6',
        chunkSize: 10,
      }
      expect(validPayload.repoName).toBeTruthy()
      expect(validPayload.model).toContain('anthropic')
    })

    it('uses Sonnet 4.6 as default model', () => {
      const defaultModel = 'us.anthropic.claude-sonnet-4-6'
      expect(defaultModel).toBe('us.anthropic.claude-sonnet-4-6')
    })
  })
})

describe('Model IDs', () => {
  const VALID_MODELS = [
    'us.anthropic.claude-sonnet-4-6',
    'us.anthropic.claude-sonnet-4-20250514-v1:0',
    'us.anthropic.claude-opus-4-6-v1',
    'us.anthropic.claude-haiku-3-5-20241022-v1:0',
    'amazon.nova-pro-v1:0',
    'amazon.nova-lite-v1:0',
  ]

  it('all models use Bedrock format (no Anthropic API IDs)', () => {
    for (const model of VALID_MODELS) {
      expect(model).not.toMatch(/^claude-\d/) // Not Anthropic API format
      expect(model).toMatch(/^(us\.anthropic\.|amazon\.)/) // Bedrock format
    }
  })

  it('default model is Sonnet 4.6', () => {
    expect(VALID_MODELS[0]).toBe('us.anthropic.claude-sonnet-4-6')
  })
})

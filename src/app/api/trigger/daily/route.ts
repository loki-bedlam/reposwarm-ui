import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { temporalClient } from '@/lib/temporal'

/**
 * POST /api/trigger/daily
 *
 * Starts an InvestigateReposWorkflow that:
 *   1. Auto-discovers repos from repos.json (worker reads it internally)
 *   2. Investigates all repos in parallel chunks
 *   3. Sleeps for `sleep_hours` then continues-as-new (runs forever on a schedule)
 *
 * Body (all optional):
 *   - sleep_hours:  number  — hours between investigation cycles (default: 24)
 *   - chunk_size:   number  — parallel repo limit per chunk (default: 10)
 *   - model:        string  — Claude model override
 *   - max_tokens:   number  — max tokens override
 *   - force:        boolean — force re-investigate even if cached (first run only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      sleep_hours = 24,
      chunk_size = 10,
      model,
      max_tokens,
      force = false,
    } = body

    const workflowId = `investigate-daily-${Date.now()}`

    // Build InvestigateReposRequest matching the Python Pydantic model
    const workflowInput: Record<string, unknown> = {
      force: Boolean(force),
      sleep_hours: Number(sleep_hours),
      chunk_size: Number(chunk_size),
      iteration_count: 0,
    }
    if (model) workflowInput.claude_model = model
    if (max_tokens) workflowInput.max_tokens = Number(max_tokens)

    logger.info('Starting daily investigation workflow', {
      workflowId,
      input: workflowInput,
    })

    const result = await temporalClient.startWorkflow(
      workflowId,
      'InvestigateReposWorkflow',
      workflowInput,
    )

    return NextResponse.json({
      success: true,
      workflowId: result.workflowId,
      runId: result.runId,
      sleepHours: sleep_hours,
      chunkSize: chunk_size,
      force,
    })
  } catch (error) {
    logger.error('Error triggering daily investigation:', {
      error: String(error),
    })
    return NextResponse.json(
      { error: 'Failed to trigger daily investigation' },
      { status: 500 },
    )
  }
}

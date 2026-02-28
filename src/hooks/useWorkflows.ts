import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WorkflowExecution, WorkflowHistory } from '@/lib/types'
import { apiFetchJson } from '@/lib/api'

interface WorkflowsResponse {
  executions: WorkflowExecution[]
  nextPageToken?: string
}

export function useWorkflows(pageSize = 25, pageToken?: string) {
  return useQuery<WorkflowsResponse>({
    queryKey: ['workflows', pageSize, pageToken],
    queryFn: () => {
      const params = new URLSearchParams({
        pageSize: pageSize.toString(),
        ...(pageToken && { pageToken })
      })
      return apiFetchJson<WorkflowsResponse>(`/workflows?${params}`)
    }
  })
}

export function useWorkflow(workflowId: string, runId?: string) {
  return useQuery<WorkflowExecution>({
    queryKey: ['workflow', workflowId, runId],
    queryFn: () => {
      const params = runId ? `?runId=${runId}` : ''
      return apiFetchJson<WorkflowExecution>(`/workflows/${workflowId}${params}`)
    },
    enabled: !!workflowId
  })
}

export function useWorkflowHistory(workflowId: string, runId?: string) {
  return useQuery<WorkflowHistory>({
    queryKey: ['workflow-history', workflowId, runId],
    queryFn: () => {
      const params = runId ? `?runId=${runId}` : ''
      return apiFetchJson<WorkflowHistory>(`/workflows/${workflowId}/history${params}`)
    },
    enabled: !!workflowId
  })
}

export function useTerminateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workflowId, runId, reason }: {
      workflowId: string
      runId?: string
      reason?: string
    }) => apiFetchJson(`/workflows/${workflowId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ runId, reason })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow'] })
    }
  })
}

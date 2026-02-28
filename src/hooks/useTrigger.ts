import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TriggerRequest } from '@/lib/types'
import { apiFetchJson } from '@/lib/api'
import toast from 'react-hot-toast'

export function useTriggerSingle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: TriggerRequest) =>
      apiFetchJson('/investigate/single', { method: 'POST', body: JSON.stringify(request) }),
    onSuccess: (data: any) => {
      toast.success(`Investigation started for ${data.repoName || 'repo'}`)
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (error: Error) => toast.error(`Failed to trigger: ${error.message}`)
  })
}

export function useTriggerDaily() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request?: TriggerRequest) =>
      apiFetchJson('/investigate/daily', { method: 'POST', body: JSON.stringify(request || {}) }),
    onSuccess: () => {
      toast.success('Daily investigation started')
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (error: Error) => toast.error(`Failed to trigger: ${error.message}`)
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Repository } from '@/lib/types'
import { apiFetchJson, apiFetch } from '@/lib/api'
import toast from 'react-hot-toast'

export function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: () => apiFetchJson<Repository[]>('/repos')
  })
}

export function useAddRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (repo: Partial<Repository>) =>
      apiFetchJson('/repos', { method: 'POST', body: JSON.stringify(repo) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] })
  })
}

export function useUpdateRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, updates }: { name: string; updates: Partial<Repository> }) =>
      apiFetchJson(`/repos/${name}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] })
  })
}

export function useDeleteRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiFetchJson(`/repos/${name}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] })
  })
}

export interface DiscoverResult {
  success: boolean
  discovered: number
  added: number
  skipped: number
  total: number
  repositories: string[]
}

export function useDiscoverRepos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetchJson<DiscoverResult>('/repos/discover', { method: 'POST' }),
    onSuccess: (data) => {
      if (data.added > 0) {
        toast.success(`Discovered ${data.discovered} repos, added ${data.added} new`)
      } else {
        toast.success(`All ${data.discovered} CodeCommit repos already tracked`)
      }
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    },
    onError: (error: Error) => toast.error(`Discovery failed: ${error.message}`)
  })
}

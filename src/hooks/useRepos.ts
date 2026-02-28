import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Repository } from '@/lib/types'
import toast from 'react-hot-toast'

export function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch('/api/repos')
      if (!response.ok) throw new Error('Failed to fetch repositories')
      return response.json() as Promise<Repository[]>
    }
  })
}

export function useAddRepo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (repo: Partial<Repository>) => {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repo)
      })
      if (!response.ok) throw new Error('Failed to add repository')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    }
  })
}

export function useUpdateRepo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, updates }: { name: string; updates: Partial<Repository> }) => {
      const response = await fetch(`/api/repos/${name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update repository')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    }
  })
}

export function useDeleteRepo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/repos/${name}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete repository')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    }
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
    mutationFn: async () => {
      const response = await fetch('/api/repos/discover', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to discover repositories')
      return response.json() as Promise<DiscoverResult>
    },
    onSuccess: (data) => {
      if (data.added > 0) {
        toast.success(`Discovered ${data.discovered} repos, added ${data.added} new`)
      } else {
        toast.success(`All ${data.discovered} CodeCommit repos already tracked`)
      }
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    },
    onError: (error: Error) => {
      toast.error(`Discovery failed: ${error.message}`)
    }
  })
}

import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'

export interface WikiSection {
  id: string
  label: string
  timestamp: number
  createdAt: string
}

export interface WikiIndex {
  repo: string
  sections: WikiSection[]
  hasDocs: boolean
}

export interface WikiContent {
  repo: string
  section: string
  content: string
  createdAt: string
  timestamp: number
  referenceKey: string
}

export function useWikiIndex(repo: string) {
  return useQuery({
    queryKey: ['wiki', repo],
    queryFn: () => apiFetchJson<WikiIndex>(`/wiki/${encodeURIComponent(repo)}`),
    enabled: !!repo
  })
}

export function useWikiSection(repo: string, section: string) {
  return useQuery({
    queryKey: ['wiki', repo, section],
    queryFn: () => apiFetchJson<WikiContent>(`/wiki/${encodeURIComponent(repo)}/${encodeURIComponent(section)}`),
    enabled: !!repo && !!section
  })
}

/**
 * Fetches wiki sections for a repo, with optional polling for live progress tracking.
 * Shares the React Query cache with useWikiIndex.
 */
export function useWikiSections(repoName: string | null, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['wiki', repoName],
    queryFn: () => apiFetchJson<WikiIndex>(`/wiki/${encodeURIComponent(repoName!)}`),
    enabled: !!repoName,
    refetchInterval: refetchInterval ?? false,
    retry: false, // Wiki may not exist yet (404) — show 0/17 gracefully
  })
}

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

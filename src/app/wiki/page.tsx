'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, Search, ChevronRight, FileText, Shield, Database, Code } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WikiRepoSummary {
  name: string
  sectionCount: number
  lastUpdated: string
  highlights: string[]
}

export default function WikiBrowsePage() {
  const [repos, setRepos] = useState<WikiRepoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchWikiRepos() {
      try {
        const { apiFetchJson } = await import('@/lib/api')
        const data = await apiFetchJson<{ repos: WikiRepoSummary[] }>('/wiki')
        setRepos(data.repos || [])
      } catch (err) {
        console.error('Failed to fetch wiki repos:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchWikiRepos()
  }, [])

  const filtered = repos.filter(r =>
    search === '' || r.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading wiki index...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Wiki
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {repos.length} repositories documented
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            {repos.length === 0 ? 'No documentation yet' : 'No results'}
          </h2>
          <p className="text-muted-foreground">
            {repos.length === 0
              ? 'Run investigations on repositories to generate documentation.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(repo => (
            <Link
              key={repo.name}
              href={`/repos/${encodeURIComponent(repo.name)}/wiki`}
              className="block bg-card rounded-lg border border-border hover:border-primary/50 p-5 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {repo.name}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {repo.sectionCount} sections
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Updated {new Date(repo.lastUpdated).toLocaleDateString()}</span>
                  </div>

                  {repo.highlights.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {repo.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/5 text-muted-foreground border border-border"
                        >
                          {i === 0 && <Code className="h-3 w-3" />}
                          {i === 1 && <Database className="h-3 w-3" />}
                          {i === 2 && <Shield className="h-3 w-3" />}
                          {i > 2 && <FileText className="h-3 w-3" />}
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, use } from 'react'
import { useWikiIndex, useWikiSection } from '@/hooks/useWiki'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen, FileText, ChevronLeft, Search, Clock,
  Shield, Database, Layers, Code, Globe, Cpu, GitBranch,
  Lock, Eye, Activity, Zap, Box, Network
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hl_overview: BookOpen,
  core_entities: Layers,
  APIs: Globe,
  api_surface: Code,
  internals: Cpu,
  module_deep_dive: FileText,
  data_mapping: Database,
  DBs: Database,
  authentication: Lock,
  authorization: Shield,
  security_check: Shield,
  prompt_security_check: Eye,
  dependencies: GitBranch,
  service_dependencies: Network,
  deployment: Box,
  monitoring: Activity,
  events: Zap,
  feature_flags: Zap,
  ml_services: Cpu
}

export default function WikiPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const repoName = decodeURIComponent(name)
  const [activeSection, setActiveSection] = useState<string>('')
  const [searchFilter, setSearchFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: index, isLoading: indexLoading } = useWikiIndex(repoName)
  const { data: content, isLoading: contentLoading } = useWikiSection(repoName, activeSection)

  // Auto-select first section
  useEffect(() => {
    if (index?.sections.length && !activeSection) {
      setActiveSection(index.sections[0].id)
    }
  }, [index, activeSection])

  const filteredSections = (index?.sections || []).filter(s =>
    searchFilter === '' || s.label.toLowerCase().includes(searchFilter.toLowerCase())
  )

  if (indexLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground">Loading documentation...</div>
        </div>
      </div>
    )
  }

  if (!index?.hasDocs) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/repos" className="p-2 hover:bg-accent rounded-lg">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold">{repoName}</h1>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No documentation yet</h2>
          <p className="text-muted-foreground mb-4">
            Run an investigation on this repository to generate architecture documentation.
          </p>
          <Link
            href="/triggers"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-block"
          >
            Go to Triggers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/repos" className="p-2 hover:bg-accent rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-semibold truncate">{repoName}</h1>
          <p className="text-sm text-muted-foreground">{index.sections.length} sections documented</p>
        </div>
        <button
          className="lg:hidden ml-auto p-2 hover:bg-accent rounded-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <FileText className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar */}
        <div className={cn(
          'w-64 shrink-0 bg-card rounded-lg border border-border overflow-hidden flex flex-col',
          'lg:flex',
          sidebarOpen ? 'fixed inset-y-20 left-4 right-4 z-40 lg:relative lg:inset-auto w-auto lg:w-64' : 'hidden'
        )}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter sections..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredSections.map(section => {
              const Icon = SECTION_ICONS[section.id] || FileText
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setSidebarOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card rounded-lg border border-border overflow-y-auto min-w-0">
          {contentLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-muted-foreground">Loading section...</div>
              </div>
            </div>
          ) : content?.content ? (
            <div className="p-4 lg:p-8">
              {content.createdAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                  <Clock className="h-3 w-3" />
                  <span>Last updated: {new Date(content.createdAt).toLocaleString()}</span>
                </div>
              )}
              <article className="prose prose-invert prose-sm lg:prose-base max-w-none
                prose-headings:text-foreground prose-headings:font-semibold
                prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-8 first:prose-h1:mt-0
                prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6
                prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground
                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg
                prose-table:border-collapse
                prose-th:border prose-th:border-border prose-th:bg-background prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-sm prose-th:font-medium
                prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-sm
                prose-li:text-muted-foreground
                prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground
                prose-hr:border-border
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.content}
                </ReactMarkdown>
              </article>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Select a section from the sidebar
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

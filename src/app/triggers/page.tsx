'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRepos, useDiscoverRepos } from '@/hooks/useRepos'
import { useTriggerSingle, useTriggerDaily } from '@/hooks/useTrigger'
import { Play, Clock, Zap, ChevronDown, Radar, Search, Filter, X } from 'lucide-react'
import { TriggerModal } from '@/components/TriggerModal'
import toast from 'react-hot-toast'

type SourceFilter = 'all' | 'CodeCommit' | 'GitHub'

export default function TriggersPage() {
  const [selectedRepo, setSelectedRepo] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [customChunkSize, setCustomChunkSize] = useState('10')
  const [customModel, setCustomModel] = useState('us.anthropic.claude-sonnet-4-6')
  const [showDailyModal, setShowDailyModal] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [customSearchFilter, setCustomSearchFilter] = useState('')
  const [customSourceFilter, setCustomSourceFilter] = useState<SourceFilter>('all')

  const { data: repos, isLoading: reposLoading } = useRepos()
  const discover = useDiscoverRepos()
  const triggerSingle = useTriggerSingle()
  const triggerDaily = useTriggerDaily()

  // Auto-discover on mount if no repos exist
  useEffect(() => {
    if (!reposLoading && repos && repos.length === 0) {
      discover.mutate({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reposLoading, repos?.length])

  // Filter repos for single trigger dropdown
  const filteredRepos = useMemo(() => {
    if (!repos) return []
    return repos.filter(repo => {
      const matchesSearch = searchFilter === '' ||
        repo.name.toLowerCase().includes(searchFilter.toLowerCase())
      const matchesSource = sourceFilter === 'all' || repo.source === sourceFilter
      return matchesSearch && matchesSource
    })
  }, [repos, searchFilter, sourceFilter])

  // Filter repos for custom trigger checkboxes
  const customFilteredRepos = useMemo(() => {
    if (!repos) return []
    return repos.filter(repo => {
      const matchesSearch = customSearchFilter === '' ||
        repo.name.toLowerCase().includes(customSearchFilter.toLowerCase())
      const matchesSource = customSourceFilter === 'all' || repo.source === customSourceFilter
      return matchesSearch && matchesSource
    })
  }, [repos, customSearchFilter, customSourceFilter])

  const enabledRepoCount = repos?.filter(r => r.enabled).length || 0

  const handleTriggerSingle = async () => {
    if (!selectedRepo) {
      toast.error('Please select a repository')
      return
    }

    await triggerSingle.mutateAsync({
      repoName: selectedRepo,
      model: customModel,
      chunkSize: parseInt(customChunkSize)
    })
    setSelectedRepo('')
  }

  const handleTriggerDaily = async () => {
    // If no repos, auto-discover first
    if (enabledRepoCount === 0) {
      toast('Discovering repos first...')
      await discover.mutateAsync({})
    }
    await triggerDaily.mutateAsync(undefined)
    setShowDailyModal(false)
  }

  const handleTriggerCustom = async () => {
    if (selectedRepos.length === 0) {
      toast.error('Please select at least one repository')
      return
    }

    await triggerDaily.mutateAsync({
      repos: selectedRepos,
      model: customModel,
      chunkSize: parseInt(customChunkSize)
    })
    setSelectedRepos([])
  }

  const toggleRepoSelection = (repoName: string) => {
    setSelectedRepos(prev =>
      prev.includes(repoName)
        ? prev.filter(r => r !== repoName)
        : [...prev, repoName]
    )
  }

  const selectAllVisible = () => {
    const visibleNames = customFilteredRepos.map(r => r.name)
    setSelectedRepos(prev => {
      const merged = new Set([...prev, ...visibleNames])
      return Array.from(merged)
    })
  }

  const deselectAllVisible = () => {
    const visibleNames = new Set(customFilteredRepos.map(r => r.name))
    setSelectedRepos(prev => prev.filter(name => !visibleNames.has(name)))
  }

  const SourceFilterButtons = ({
    value,
    onChange
  }: {
    value: SourceFilter
    onChange: (v: SourceFilter) => void
  }) => (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {(['all', 'CodeCommit', 'GitHub'] as SourceFilter[]).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === s
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent'
          }`}
        >
          {s === 'all' ? 'All' : s}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Schedule Info + Discover */}
      <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Daily Schedule</h2>
          </div>
          <button
            onClick={() => discover.mutate({})}
            disabled={discover.isPending}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Radar className={`h-4 w-4 ${discover.isPending ? 'animate-spin' : ''}`} />
            {discover.isPending ? 'Discovering...' : 'Refresh Repos'}
          </button>
        </div>

        {/* Discovery result */}
        {discover.data && (
          <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg text-sm">
            <span className="font-medium text-amber-400">Synced:</span>{' '}
            {discover.data.discovered} repos found
            {discover.data.added > 0 && (
              <span className="text-green-400"> — {discover.data.added} new added</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Schedule</p>
            <p className="font-medium">Every 6 hours</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tracked Repos</p>
            <p className="font-medium">
              {reposLoading ? '...' : `${enabledRepoCount} enabled / ${repos?.length || 0} total`}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sources</p>
            <p className="font-medium">
              {repos ? (
                <>
                  {repos.filter(r => r.source === 'CodeCommit').length} CodeCommit
                  {repos.some(r => r.source === 'GitHub') && `, ${repos.filter(r => r.source === 'GitHub').length} GitHub`}
                </>
              ) : '...'}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Repo Trigger */}
        <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Single Repository</h2>
          </div>
          <div className="space-y-3">
            {/* Filter controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <SourceFilterButtons value={sourceFilter} onChange={setSourceFilter} />
            </div>

            {/* Repo dropdown */}
            <div className="relative">
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10"
              >
                <option value="">
                  {reposLoading
                    ? 'Loading repositories...'
                    : filteredRepos.length === 0
                    ? 'No repos found — click Refresh Repos'
                    : `Select from ${filteredRepos.length} repositories...`}
                </option>
                {filteredRepos.map(repo => (
                  <option key={repo.name} value={repo.name}>
                    {repo.name} ({repo.source})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={handleTriggerSingle}
              disabled={!selectedRepo || triggerSingle.isPending}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggerSingle.isPending ? 'Triggering...' : 'Investigate Repository'}
            </button>
          </div>
        </div>

        {/* Full Daily Trigger */}
        <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Full Daily Investigation</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {enabledRepoCount > 0
                ? `Run investigation on all ${enabledRepoCount} enabled repositories`
                : 'No repos configured yet — will auto-discover from CodeCommit first'}
            </p>
            <button
              onClick={() => setShowDailyModal(true)}
              disabled={triggerDaily.isPending || discover.isPending}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {triggerDaily.isPending
                ? 'Triggering...'
                : discover.isPending
                ? 'Discovering repos...'
                : enabledRepoCount > 0
                ? 'Run All Repositories'
                : 'Discover & Run All'}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Trigger */}
      <div className="bg-card rounded-lg border border-border p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Custom Investigation</h2>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-sm text-primary hover:underline"
          >
            {showCustom ? 'Hide Options' : 'Show Options'}
          </button>
        </div>

        {showCustom && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Select Repositories</label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{selectedRepos.length} selected</span>
                  <button onClick={selectAllVisible} className="text-primary hover:underline">Select all</button>
                  <span className="text-border">|</span>
                  <button onClick={deselectAllVisible} className="text-primary hover:underline">Clear</button>
                </div>
              </div>

              {/* Custom filter controls */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter repos..."
                    value={customSearchFilter}
                    onChange={(e) => setCustomSearchFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {customSearchFilter && (
                    <button
                      onClick={() => setCustomSearchFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <SourceFilterButtons value={customSourceFilter} onChange={setCustomSourceFilter} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {customFilteredRepos.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
                    {repos?.length === 0
                      ? 'No repos — click "Refresh Repos" above'
                      : 'No repos match filter'}
                  </div>
                ) : (
                  customFilteredRepos.map(repo => (
                    <label
                      key={repo.name}
                      className={`flex items-center gap-2 p-2 bg-background rounded border transition-colors cursor-pointer ${
                        selectedRepos.includes(repo.name)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRepos.includes(repo.name)}
                        onChange={() => toggleRepoSelection(repo.name)}
                        className="rounded border-border"
                      />
                      <div className="min-w-0">
                        <span className="text-sm truncate block">{repo.name}</span>
                        <span className="text-xs text-muted-foreground">{repo.source}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chunk Size</label>
                <input
                  type="number"
                  value={customChunkSize}
                  onChange={(e) => setCustomChunkSize(e.target.value)}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="us.anthropic.claude-sonnet-4-6">Claude Sonnet 4.6 (default)</option>
                  <option value="us.anthropic.claude-sonnet-4-20250514-v1:0">Claude Sonnet 4</option>
                  <option value="us.anthropic.claude-opus-4-6-v1">Claude Opus 4.6</option>
                  <option value="us.anthropic.claude-haiku-3-5-20241022-v1:0">Claude Haiku 3.5</option>
                  <option value="amazon.nova-pro-v1:0">Amazon Nova Pro</option>
                  <option value="amazon.nova-lite-v1:0">Amazon Nova Lite</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleTriggerCustom}
              disabled={selectedRepos.length === 0 || triggerDaily.isPending}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggerDaily.isPending
                ? 'Triggering...'
                : `Investigate ${selectedRepos.length} Repository(s)`}
            </button>
          </div>
        )}
      </div>

      {/* Daily Trigger Modal */}
      <TriggerModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onConfirm={handleTriggerDaily}
        title="Run Daily Investigation"
        description={
          enabledRepoCount > 0
            ? `This will trigger investigation on all ${enabledRepoCount} enabled repositories. Continue?`
            : 'No repos configured yet. This will auto-discover all CodeCommit repositories and run investigation on them. Continue?'
        }
        confirmText={enabledRepoCount > 0 ? 'Run Investigation' : 'Discover & Run'}
        isLoading={triggerDaily.isPending || discover.isPending}
      />
    </div>
  )
}

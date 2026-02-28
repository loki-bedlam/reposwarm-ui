'use client'

import { usePathname } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/workflows': 'Workflows',
  '/repos': 'Repositories',
  '/triggers': 'Triggers',
  '/settings': 'Settings',
}

export function Header() {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const getPageTitle = () => {
    if (pathname.startsWith('/workflows/')) {
      return 'Workflow Detail'
    }
    return pageTitles[pathname] || 'RepoSwarm'
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
      <h1 className="text-xl lg:text-2xl font-semibold pl-10 lg:pl-0">{getPageTitle()}</h1>
      <button
        onClick={handleRefresh}
        className="p-2 hover:bg-accent rounded-lg transition-colors"
        title="Refresh data"
      >
        <RefreshCw className="h-5 w-5" />
      </button>
    </header>
  )
}

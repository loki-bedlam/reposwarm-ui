'use client'

import { useState } from 'react'
import { Terminal, Copy, Check, Monitor, Key, Globe, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-background border border-border rounded-lg p-4 text-sm overflow-x-auto">
        <code className="text-foreground">{children}</code>
      </pre>
      <CopyButton text={copyText || children} />
    </div>
  )
}

export default function ConnectPage() {
  const apiUrl = typeof window !== 'undefined' ? `${window.location.origin}/v1` : '/v1'
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  const configJson = JSON.stringify({
    apiUrl,
    apiToken: token || '<your-api-token>'
  }, null, 2)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          Connect CLI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect the RepoSwarm CLI to this server to manage repos, trigger investigations, and browse results from your terminal.
        </p>
      </div>

      {/* Step 1: Install */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
          <h2 className="text-lg font-semibold">Install the CLI</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          One-line install (macOS, Linux — x86_64 and ARM64):
        </p>
        <CodeBlock>{'curl -fsSL https://db22kd0yixg8j.cloudfront.net/assets/reposwarm-cli/latest/install.sh | sh'}</CodeBlock>
        <p className="text-xs text-muted-foreground">
          Or install from source: <code className="text-primary bg-primary/10 px-1 rounded">go install github.com/loki-bedlam/reposwarm-cli/cmd/reposwarm@latest</code>
        </p>
      </section>

      {/* Step 2: Configure */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
          <h2 className="text-lg font-semibold">Configure connection</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Globe className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">API URL</div>
              <div className="text-xs text-muted-foreground mb-1">This server&apos;s API endpoint</div>
              <div className="bg-background border border-border rounded-md px-3 py-2 text-sm font-mono flex items-center justify-between">
                <span>{apiUrl}</span>
                <CopyButton text={apiUrl} />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Key className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">API Token</div>
              <div className="text-xs text-muted-foreground mb-1">Bearer token for authentication. Get this from your admin or Settings.</div>
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your API token here..."
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-primary hover:underline mt-1"
              >
                {showToken ? 'Hide' : 'Show'} token
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Option A:</strong> Interactive setup (recommended)
          </p>
          <CodeBlock>{'reposwarm config init'}</CodeBlock>
        </div>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Option B:</strong> Write config directly
          </p>
          <CodeBlock copyText={`mkdir -p ~/.reposwarm && cat > ~/.reposwarm/config.json << 'EOF'\n${configJson}\nEOF`}>
            {`mkdir -p ~/.reposwarm && cat > ~/.reposwarm/config.json << 'EOF'\n${configJson}\nEOF`}
          </CodeBlock>
        </div>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Option C:</strong> Environment variables
          </p>
          <CodeBlock copyText={`export REPOSWARM_API_URL="${apiUrl}"\nexport REPOSWARM_API_TOKEN="${token || '<your-api-token>'}"`}>
            {`export REPOSWARM_API_URL="${apiUrl}"\nexport REPOSWARM_API_TOKEN="${token || '<your-api-token>'}"`}
          </CodeBlock>
        </div>
      </section>

      {/* Step 3: Verify */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold">3</div>
          <h2 className="text-lg font-semibold">Verify connection</h2>
        </div>
        <CodeBlock>{'reposwarm status'}</CodeBlock>
        <p className="text-sm text-muted-foreground">
          You should see the API, Temporal, DynamoDB, and Worker status.
        </p>
      </section>

      {/* Quick reference */}
      <section className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Quick reference</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { cmd: 'reposwarm repos list', desc: 'List tracked repositories' },
            { cmd: 'reposwarm repos discover', desc: 'Discover & add repos' },
            { cmd: 'reposwarm investigate <repo>', desc: 'Run investigation' },
            { cmd: 'reposwarm investigate --all', desc: 'Investigate all repos' },
            { cmd: 'reposwarm wf progress', desc: 'Check investigation progress' },
            { cmd: 'reposwarm results audit', desc: 'Validate section coverage' },
            { cmd: 'reposwarm results sections <repo>', desc: 'List sections for a repo' },
            { cmd: 'reposwarm results read <repo> <section>', desc: 'Read a section' },
            { cmd: 'reposwarm results export --all -d ./docs', desc: 'Export all results locally' },
            { cmd: 'reposwarm results search "query" --repo <r>', desc: 'Search results' },
            { cmd: 'reposwarm doctor', desc: 'Diagnose connectivity' },
            { cmd: 'reposwarm status', desc: 'Server health check' },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex flex-col gap-0.5 p-2 rounded-md bg-background border border-border">
              <code className="text-xs text-primary font-mono">{cmd}</code>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

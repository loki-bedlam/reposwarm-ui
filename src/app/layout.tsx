import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RepoSwarm UI',
  description: 'AI-powered multi-repo architecture discovery platform',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <Header />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: '',
              style: {
                background: 'hsl(224 71% 4%)',
                color: 'hsl(210 20% 98%)',
                border: '1px solid hsl(220 13% 20%)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}

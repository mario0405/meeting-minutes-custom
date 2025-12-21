'use client'

import './globals.css'
import { Source_Sans_3 } from 'next/font/google'
import Sidebar from '@/components/Sidebar'
import { SidebarProvider } from '@/components/Sidebar/SidebarProvider'
import MainContent from '@/components/MainContent'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import { Toaster } from 'sonner'
import "sonner/dist/styles.css"
import { useState, useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { LegacyDatabaseImport } from '@/components/DatabaseImport/LegacyDatabaseImport'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RecordingStateProvider } from '@/contexts/RecordingStateContext'
import { OllamaDownloadProvider } from '@/contexts/OllamaDownloadContext'

const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-sans-3',
})

// export { metadata } from './metadata'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [dbReady, setDbReady] = useState(false)

  // Ensure client-side only rendering to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Check first launch state immediately on mount (reliable)
    invoke<boolean>('check_first_launch')
      .then((isFirstLaunch) => {
        console.log('First launch check result:', isFirstLaunch)
        if (isFirstLaunch) {
          console.log('First launch detected - showing import dialog')
          setShowImportDialog(true)
          setDbReady(false)
        } else {
          setShowImportDialog(false)
          setDbReady(true)
        }
      })
      .catch((error) => {
        console.error('Failed to check first launch:', error)
        setShowImportDialog(false)
        setDbReady(true)
      })

    // Also listen for events (fallback for hot reload and edge cases)
    const unlistenFirstLaunch = listen('first-launch-detected', () => {
      console.log('First launch event received - showing import dialog')
      setShowImportDialog(true)
    })

    // Listen for database initialized event
    const unlistenDbInit = listen('database-initialized', () => {
      console.log('Database initialized - hiding import dialog')
      setShowImportDialog(false)
      setDbReady(true)
    })

    return () => {
      unlistenFirstLaunch.then((fn) => fn())
      unlistenDbInit.then((fn) => fn())
    }
  }, [isMounted])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <html lang="de">
        <body className={`${sourceSans3.variable} font-sans`}>
          <div className="flex h-screen items-center justify-center">
            <div className="animate-pulse text-gray-400">Laden...</div>
          </div>
        </body>
      </html>
    )
  }

  if (!dbReady) {
    return (
      <html lang="de">
        <body className={`${sourceSans3.variable} font-sans`}>
          <div className="flex h-screen items-center justify-center">
            <div className="animate-pulse text-gray-400">Datenbank wird vorbereitet...</div>
          </div>
          <LegacyDatabaseImport
            isOpen={showImportDialog}
            onComplete={() => setShowImportDialog(false)}
          />
          <Toaster position="bottom-center" richColors closeButton />
        </body>
      </html>
    )
  }

  return (
    <html lang="de">
      <body className={`${sourceSans3.variable} font-sans`}>
        <AnalyticsProvider>
          <RecordingStateProvider>
            <OllamaDownloadProvider>
              <SidebarProvider>
                <TooltipProvider>
                  {/* <div className="titlebar h-8 w-full fixed top-0 left-0 bg-transparent" /> */}
                  <div className="flex">
                    <Sidebar />
                    <MainContent>{children}</MainContent>
                  </div>
                </TooltipProvider>
              </SidebarProvider>
            </OllamaDownloadProvider>
          </RecordingStateProvider>
        </AnalyticsProvider>
        <Toaster position="bottom-center" richColors closeButton />
        <LegacyDatabaseImport
          isOpen={showImportDialog}
          onComplete={() => setShowImportDialog(false)}
        />
      </body>
    </html>
  )
}

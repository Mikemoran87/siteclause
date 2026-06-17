import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ProjectView from './pages/ProjectView'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import Results from './pages/Results'
import type { AnalysisResult } from './types'

type AppPage = 'auth' | 'dashboard' | 'project'
type DemoPage = 'landing' | 'upload' | 'results'

// Check if user navigated to /demo
const isDemo = () =>
  typeof window !== 'undefined' &&
  (window.location.pathname === '/demo' || window.location.pathname.startsWith('/demo/'))

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [appPage, setAppPage] = useState<AppPage>('auth')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(isDemo())

  // Demo sub-state
  const [demoPage, setDemoPage] = useState<DemoPage>('landing')
  const [demoResults, setDemoResults] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
      if (session) setAppPage('dashboard')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setAppPage('dashboard')
        setDemoMode(false)
      } else {
        setAppPage('auth')
        setSelectedProjectId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle /demo route changes
  useEffect(() => {
    const checkDemo = () => setDemoMode(isDemo())
    window.addEventListener('popstate', checkDemo)
    return () => window.removeEventListener('popstate', checkDemo)
  }, [])

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  // Demo mode — always accessible regardless of auth state
  if (demoMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        {demoPage === 'landing' && <Landing onStart={() => setDemoPage('upload')} />}
        {demoPage === 'upload' && (
          <Upload
            onBack={() => setDemoPage('landing')}
            onResults={(r) => { setDemoResults(r); setDemoPage('results') }}
          />
        )}
        {demoPage === 'results' && demoResults && (
          <Results
            results={demoResults}
            onReset={() => { setDemoResults(null); setDemoPage('upload') }}
          />
        )}
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return <AuthPage />
  }

  // Authenticated — project view
  if (appPage === 'project' && selectedProjectId) {
    return (
      <ProjectView
        projectId={selectedProjectId}
        userId={session.user.id}
        onBack={() => {
          setAppPage('dashboard')
          setSelectedProjectId(null)
        }}
      />
    )
  }

  // Authenticated — dashboard
  return (
    <Dashboard
      userId={session.user.id}
      onSelectProject={(projectId) => {
        setSelectedProjectId(projectId)
        setAppPage('project')
      }}
    />
  )
}

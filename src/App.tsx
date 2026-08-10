import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ProjectView from './pages/ProjectView'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import Results from './pages/Results'
import LeadFunnel from './pages/LeadFunnel'
import LoginPage from './pages/LoginPage'
import type { AnalysisResult } from './types'

type AppPage = 'auth' | 'dashboard' | 'project'
type DemoPage = 'landing' | 'upload' | 'results'

const getPath = () =>
  typeof window !== 'undefined' ? window.location.pathname : '/'

const isDemo = () => {
  const p = getPath()
  return p === '/demo' || p.startsWith('/demo/')
}

const isAnalyse = () => {
  const p = getPath()
  return p === '/analyse' || p.startsWith('/analyse/')
}

const isLogin = () => {
  const p = getPath()
  return p === '/login' || p.startsWith('/login/')
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [appPage, setAppPage] = useState<AppPage>(() => {
    const saved = sessionStorage.getItem('sc_page') as AppPage | null
    return saved ?? 'auth'
  })
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return sessionStorage.getItem('sc_project_id') ?? null
  })
  const [demoMode, setDemoMode] = useState(isDemo())
  const [analyseMode, setAnalyseMode] = useState(isAnalyse())
  const [loginMode, setLoginMode] = useState(isLogin())

  // Demo sub-state
  const [demoPage, setDemoPage] = useState<DemoPage>('landing')
  const [demoResults, setDemoResults] = useState<AnalysisResult | null>(null)

  // Persist navigation state across tab switches
  useEffect(() => {
    sessionStorage.setItem('sc_page', appPage)
  }, [appPage])

  useEffect(() => {
    if (selectedProjectId) {
      sessionStorage.setItem('sc_project_id', selectedProjectId)
    } else {
      sessionStorage.removeItem('sc_project_id')
    }
  }, [selectedProjectId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
      if (session) {
        // Restore saved page — don't override if already set from sessionStorage init
        const savedPage = sessionStorage.getItem('sc_page') as AppPage | null
        const savedProject = sessionStorage.getItem('sc_project_id')
        if (savedPage === 'project' && savedProject) {
          setAppPage('project')
          setSelectedProjectId(savedProject)
        } else if (!savedPage || savedPage === 'auth') {
          setAppPage('dashboard')
        }
        // If savedPage is 'dashboard' or 'project', leave state as-is (already initialised from sessionStorage)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        // Only reset to dashboard on actual sign-in, not on token refresh or tab focus
        if (event === 'SIGNED_IN') {
          setAppPage('dashboard')
          setDemoMode(false)
          setAnalyseMode(false)
          setLoginMode(false)
        }
        // For TOKEN_REFRESHED and other events, keep current page
      } else {
        setAppPage('auth')
        setSelectedProjectId(null)
        sessionStorage.removeItem('sc_page')
        sessionStorage.removeItem('sc_project_id')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Track route changes (back/forward)
  useEffect(() => {
    const onPop = () => {
      setDemoMode(isDemo())
      setAnalyseMode(isAnalyse())
      setLoginMode(isLogin())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  // ── /analyse — always accessible, no auth required ──
  if (analyseMode) {
    return <LeadFunnel />
  }

  // ── /login — always accessible ──
  if (loginMode) {
    // If already logged in, redirect to dashboard
    if (session) {
      setAppPage('dashboard')
      setLoginMode(false)
      // Fall through to dashboard below
    } else {
      return <LoginPage />
    }
  }

  // ── /demo — always accessible ──
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

  // ── Not authenticated ──
  if (!session) {
    return <AuthPage />
  }

  // ── Project view ──
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

  // ── Dashboard ──
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

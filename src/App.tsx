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

type DemoPage = 'landing' | 'upload' | 'results'

// ── URL helpers ──────────────────────────────────────────────────────────────

function getPath() {
  return typeof window !== 'undefined' ? window.location.pathname : '/'
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function parseRoute() {
  const path = getPath()
  if (path === '/demo' || path.startsWith('/demo/')) return { page: 'demo' as const }
  if (path === '/analyse' || path.startsWith('/analyse/')) return { page: 'analyse' as const }
  if (path === '/login' || path.startsWith('/login/')) return { page: 'login' as const }
  if (path === '/dashboard') return { page: 'dashboard' as const }
  const projectMatch = path.match(/^\/project\/([^/]+)/)
  if (projectMatch) return { page: 'project' as const, projectId: projectMatch[1] }
  return { page: 'dashboard' as const }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [route, setRoute] = useState(parseRoute)

  // Demo sub-state
  const [demoPage, setDemoPage] = useState<DemoPage>('landing')
  const [demoResults, setDemoResults] = useState<AnalysisResult | null>(null)

  // Listen to URL changes
  useEffect(() => {
    const onPop = () => setRoute(parseRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
      // If on root or /login with a session, go to dashboard
      if (session) {
        const r = parseRoute()
        if (r.page === 'login' || getPath() === '/') {
          navigate('/dashboard')
        }
      } else {
        // Not logged in — only allow public routes
        const r = parseRoute()
        if (r.page !== 'demo' && r.page !== 'analyse' && r.page !== 'login') {
          navigate('/login')
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard')
      }
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
      // TOKEN_REFRESHED etc — do nothing, stay on current page
    })

    return () => subscription.unsubscribe()
  }, [])

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  // ── /analyse ──
  if (route.page === 'analyse') return <LeadFunnel />

  // ── /login ──
  if (route.page === 'login') {
    if (session) { navigate('/dashboard'); return null }
    return <LoginPage />
  }

  // ── /demo ──
  if (route.page === 'demo') {
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
  if (!session) return <AuthPage />

  // ── /project/:id ──
  if (route.page === 'project' && route.projectId) {
    return (
      <ProjectView
        projectId={route.projectId}
        userId={session.user.id}
        onBack={() => navigate('/dashboard')}
      />
    )
  }

  // ── /dashboard (default) ──
  return (
    <Dashboard
      userId={session.user.id}
      onSelectProject={(projectId) => navigate(`/project/${projectId}`)}
    />
  )
}

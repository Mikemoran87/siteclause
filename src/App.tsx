import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { getApprovalStatus } from './lib/db'
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
  if (path === '/' || path === '') return { page: 'home' as const }
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
  const [approved, setApproved] = useState<'approved' | 'pending' | 'unknown' | 'checking'>('checking')
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
      if (session) {
        // Check approval status
        const status = await getApprovalStatus(session.user.id)
        setApproved(status)
        // Logged in and approved → navigate to app
        if (status === 'approved') {
          const path = getPath()
          if (path === '/' || path === '/login' || path === '/auth') {
            navigate('/dashboard')
          }
        }
      } else {
        setApproved('unknown')
      }
      // Not logged in — stay on current page
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session) {
        // Check approval on sign-in
        const status = await getApprovalStatus(session.user.id)
        setApproved(status)
        if (status === 'approved') {
          const currentPath = getPath()
          const isAuthPage = currentPath === '/login' || currentPath === '/' || currentPath === '/auth'
          if (isAuthPage) navigate('/dashboard')
        }
        // Pending — stay on login page, approval screen will show
      }
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
      // TOKEN_REFRESHED, INITIAL_SESSION etc — do nothing
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

  // ── / (homepage — public marketing site) ──
  if (route.page === 'home') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Landing onStart={() => navigate('/analyse')} onLogin={() => navigate('/login')} />
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

  // ── Pending approval ──
  if (session && (approved === 'pending' || approved === 'checking')) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-2xl font-black text-amber-500 tracking-tight mb-8">
          Site<span className="text-gray-900">Clause</span>
        </div>
        <div className="max-w-md text-center">
          <div className="text-5xl mb-6">{approved === 'checking' ? '⏳' : '🔐'}</div>
          <h1 className="text-2xl font-black text-gray-900 mb-3">
            {approved === 'checking' ? 'Checking access...' : 'Access Pending Approval'}
          </h1>
          {approved === 'pending' && (
            <>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Your account is registered. Access will be granted shortly.
                If you need immediate access, email <a href="mailto:hello@siteclause.io" className="text-amber-500 font-semibold">hello@siteclause.io</a>.
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
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

import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

const initialMode = (): Mode => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('signup') === '1') return 'signup'
  }
  return 'login'
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const clear = () => { setError(''); setMessage('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clear(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); clear()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message) } else { setMessage('Check your email to confirm your account.') }
    setLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); clear(); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message) } else { setMessage('Reset link sent — check your inbox.') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-black tracking-tight cursor-pointer">
            <span className="text-amber-500">Site</span>
            <span className="text-gray-900">Clause</span>
          </a>
          <a href="/analyse" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Try for free →
          </a>
        </div>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden">

          {/* Tab switcher */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-gray-100">
              {(['login', 'signup'] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); clear() }}
                  className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === m ? 'bg-[#111] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          <div className="px-8 pb-8 pt-6">
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3">
                <input type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-300" />
                <input type="password" placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-300" />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60 min-h-[44px]">
                  {loading ? 'Logging in…' : 'Log In →'}
                </button>
                <button type="button" onClick={() => { setMode('forgot'); clear() }}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2">
                  Forgot password?
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">Free to start. No credit card required.</p>
                <input type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-300" />
                <input type="password" placeholder="Password (min. 6 characters)" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-300" />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {message && <p className="text-green-600 text-sm">{message}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60 min-h-[44px]">
                  {loading ? 'Creating account…' : 'Create Free Account →'}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-3">
                <h2 className="text-lg font-black text-gray-900 mb-1">Reset your password</h2>
                <p className="text-sm text-gray-400 mb-4">Enter your email and we'll send a reset link.</p>
                <input type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-300" />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {message && <p className="text-green-600 text-sm">{message}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60 min-h-[44px]">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => { setMode('login'); clear() }}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2">
                  ← Back to Log In
                </button>
              </form>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <a href="/analyse" className="text-sm text-gray-500 hover:text-gray-700">
                Try the demo without an account →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

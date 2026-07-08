import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
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
    // App.tsx auth listener will redirect on success
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
          <a href="/" className="text-xl font-black tracking-tight select-none">
            <span className="text-amber-500">Site</span>
            <span className="text-gray-900">Clause</span>
          </a>
          <a
            href="/analyse"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Try for free →
          </a>
        </div>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h1 className="text-xl font-black text-gray-900 mb-1">
              {mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
            </h1>
            <p className="text-sm text-gray-400">
              {mode === 'forgot'
                ? "Enter your email and we'll send a reset link."
                : 'Log in to your SiteClause account.'}
            </p>
          </div>

          <div className="px-8 pb-8 pt-5">
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {loading ? 'Logging in…' : 'Log In →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); clear() }}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  Forgot password?
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgot} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {message && <p className="text-green-600 text-sm">{message}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full text-sm transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); clear() }}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  ← Back to Log In
                </button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <a href="/analyse" className="text-gray-900 font-semibold hover:underline">
                  Try for free →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

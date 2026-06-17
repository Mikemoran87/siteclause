import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const clearState = () => {
    setError('')
    setMessage('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearState()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    clearState()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    clearState()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password reset email sent. Check your inbox.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1B4332] px-6 py-5 text-center">
        <div className="text-3xl font-black tracking-tight mb-1">
          <span className="text-amber-400">Site</span>
          <span className="text-white">Clause</span>
        </div>
        <p className="text-green-200 text-sm font-medium">
          Your subcontract is full of money you don't know you're owed.
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pt-10">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => { setMode('login'); clearState() }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  mode === 'login'
                    ? 'text-[#1B4332] border-b-2 border-[#1B4332] -mb-[2px]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => { setMode('signup'); clearState() }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  mode === 'signup'
                    ? 'text-[#1B4332] border-b-2 border-[#1B4332] -mb-[2px]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          <div className="p-6">
            {mode === 'forgot' && (
              <div className="mb-4">
                <button
                  onClick={() => { setMode('login'); clearState() }}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  ← Back to login
                </button>
                <h2 className="text-lg font-black text-gray-900 mt-3">Reset password</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send a reset link.</p>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                >
                  {loading
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Log In'
                      : mode === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Link'}
                </button>
              </div>
            </form>

            {mode === 'login' && (
              <button
                onClick={() => { setMode('forgot'); clearState() }}
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline w-full text-center"
              >
                Forgot password?
              </button>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <a
                href="/demo"
                className="text-sm text-amber-600 font-semibold hover:text-amber-700"
              >
                Try the demo without an account →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-400">
        siteclause.io · hello@siteclause.io
      </div>
    </div>
  )
}

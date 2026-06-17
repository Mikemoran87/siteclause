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

  const clearState = () => { setError(''); setMessage('') }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearState(); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); clearState()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message) } else { setMessage('Check your email to confirm your account.') }
    setLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); clearState(); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message) } else { setMessage('Password reset email sent. Check your inbox.') }
    setLoading(false)
  }

  const scrollToLogin = () => {
    document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="text-2xl font-black text-amber-500 tracking-tight">
          Site<span className="text-gray-900">Clause</span>
        </div>
        <button onClick={scrollToLogin} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
          Log In →
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-wide">
          ⚖️ JCT · NEC · FIDIC · RIAI Contracts
        </div>
        <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
          Your subcontract is full of money<br />
          <span className="text-amber-500">you don't know you're owed.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Upload your contract and site emails. SiteClause finds every variation claim, tracks every deadline, and drafts your notices — in under 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={scrollToLogin} className="bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold px-10 py-4 rounded-xl transition-colors shadow-lg shadow-amber-200">
            Get Started Free →
          </button>
          <a href="/demo" className="border-2 border-amber-500 text-amber-600 hover:bg-amber-50 text-base font-bold px-8 py-4 rounded-xl transition-colors">
            Try the Demo →
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-4">No credit card needed. No documents required for the demo.</p>
      </section>

      {/* Stats */}
      <section className="bg-amber-50 border-y border-amber-100 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '3–5%', label: 'Industry estimate: 3–5% of contract value lost to unclaimed variations' },
            { value: '< 2 min', label: 'From upload to full claim analysis and drafted notices' },
            { value: '0', label: 'Lawyers or QS needed to get your full entitlement' },
          ].map((s) => (
            <div key={s.value}>
              <div className="text-4xl font-black text-amber-500 mb-2">{s.value}</div>
              <div className="text-sm text-gray-500 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-gray-900 text-center mb-12">What happens without SiteClause</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3">
              <span className="text-xs font-bold text-red-700 uppercase tracking-widest">⚠️ Without SiteClause</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                "Main contractor says \"we'll sort the VO later\" — it never happens",
                'Variation emails pile up, nobody submits a formal claim',
                'Notice deadline passes — entitlement is lost',
                'Final account comes in 15% short — no paperwork to fight it',
                'You absorb the loss and move on',
              ].map((t) => (
                <div key={t} className="flex gap-3 items-start">
                  <span className="text-red-400 mt-0.5 text-sm flex-shrink-0">✗</span>
                  <span className="text-sm text-gray-600">{t}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-50 border-t border-red-100 px-5 py-3 text-center text-xs font-bold text-red-700">
              Industry estimate: 3–5% of contract value lost to unclaimed variations
            </div>
          </div>
          <div className="rounded-2xl border-2 border-amber-400 overflow-hidden shadow-lg shadow-amber-100">
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">✓ With SiteClause</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                'Upload contract + emails — AI reads everything in seconds',
                'Every variation event identified, valued, and categorised',
                "Deadline tracker shows exactly what's urgent and what's safe",
                'Draft notices generated, ready to send with one click',
                'Full entitlement recovered at final account',
              ].map((t) => (
                <div key={t} className="flex gap-3 items-start">
                  <span className="text-amber-500 mt-0.5 text-sm flex-shrink-0">✓</span>
                  <span className="text-sm text-gray-600">{t}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border-t border-amber-200 px-5 py-3 text-center text-xs font-bold text-amber-800">
              Full entitlement recovered — in 2 minutes
            </div>
          </div>
        </div>
      </section>

      {/* Ask Your Contract */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-2 gap-0">
            <div className="p-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide w-fit">
                AI Feature
              </div>
              <h2 className="text-3xl font-black text-white leading-tight mb-4">Ask your contract<br />anything.</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Once SiteClause reads your contract, ask it anything in plain English. What are my notice deadlines? Can the MC back-charge me? What does clause 5.3 actually mean?
              </p>
              <div className="space-y-2">
                {[
                  'If the MC is late, can I claim delay damages?',
                  'What happens if I do extra work without a VO?',
                  'Can the main contractor back-charge me without notice?',
                ].map(q => (
                  <div key={q} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-amber-500 flex-shrink-0">→</span>
                    <span className="italic">"{q}"</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 p-8 flex flex-col justify-center gap-4">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
                <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 leading-relaxed">
                  I've read your JCT subcontract. Ask me anything about it.
                </div>
              </div>
              <div className="flex gap-3 items-start justify-end">
                <div className="bg-amber-500 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed">
                  If the MC delayed my concrete pour by 2 days, can I claim standing time?
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
                <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 leading-relaxed">
                  Yes — under <span className="text-amber-400 font-semibold">Clause 7.1</span>, you're entitled to loss and expense for MC-caused delays. You must give written notice within <span className="text-amber-400 font-semibold">7 days</span> with contemporary records.
                  <span className="block text-gray-500 text-xs mt-2">AI-generated guidance, not legal advice.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">Built for people on the ground</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: '🏗️', title: 'Subcontractors', desc: 'Stop leaving money on the table. Know your entitlement before final account.' },
              { icon: '📋', title: 'Project Managers', desc: 'Track every contractual obligation across your projects. No surprises at handover.' },
              { icon: '💼', title: 'Quantity Surveyors', desc: 'AI-drafted notices and valuations ready to review, not start from scratch.' },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="text-3xl mb-3">{c.icon}</div>
                <div className="font-bold text-gray-900 mb-2">{c.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login / Signup Section */}
      <section id="login-section" className="bg-gray-900 py-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-3xl font-black mb-2">
              <span className="text-amber-400">Site</span><span className="text-white">Clause</span>
            </div>
            <p className="text-gray-400 text-sm">Sign in or create your account to get started</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Tabs */}
            {mode !== 'forgot' && (
              <div className="flex border-b border-gray-100">
                {(['login', 'signup'] as Mode[]).map((m) => (
                  <button key={m} onClick={() => { setMode(m); clearState() }}
                    className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === m ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                    {m === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                ))}
              </div>
            )}

            <div className="p-8">
              {mode === 'forgot' ? (
                <>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Reset your password</h3>
                  <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a reset link.</p>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}
                    <button type="submit" disabled={loading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-60">
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button type="button" onClick={() => { setMode('login'); clearState() }}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700">
                      ← Back to Log In
                    </button>
                  </form>
                </>
              ) : mode === 'login' ? (
                <>
                  <h3 className="font-black text-gray-900 text-lg mb-6">Welcome back</h3>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}
                    <button type="submit" disabled={loading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-60">
                      {loading ? 'Logging in...' : 'Log In →'}
                    </button>
                    <button type="button" onClick={() => { setMode('forgot'); clearState() }}
                      className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                      Forgot password?
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Create your account</h3>
                  <p className="text-gray-500 text-sm mb-6">Free to start. No credit card required.</p>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="password" placeholder="Password (min. 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}
                    <button type="submit" disabled={loading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-60">
                      {loading ? 'Creating account...' : 'Create Account →'}
                    </button>
                  </form>
                </>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <a href="/demo" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  Try the demo without an account →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-black text-amber-500">Site<span className="text-gray-900">Clause</span></div>
          <div className="text-sm text-gray-400">hello@siteclause.io · siteclause.io</div>
        </div>
      </footer>
    </div>
  )
}

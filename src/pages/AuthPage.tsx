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
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-black tracking-tight select-none">
            <span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span>
          </div>
          <button
            onClick={scrollToLogin}
            className="bg-[#111] hover:bg-[#333] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
          >
            Log in →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #FFF8F5 0%, #F5F0FF 100%)' }} className="px-6 pt-24 pb-20 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
            Construction Contract Intelligence
          </p>
          <h1 className="text-6xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
            Your subcontract is full of money<br />
            you don't know you're owed.
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
            Upload your contract and site correspondence. SiteClause finds every variation claim,
            tracks every deadline, and drafts your formal notices.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <button
              onClick={scrollToLogin}
              className="bg-[#111] hover:bg-[#333] text-white font-semibold px-8 py-3.5 rounded-full text-base transition-colors"
            >
              Try the Demo →
            </button>
          </div>
          <p className="text-sm text-gray-400">No credit card needed.</p>

          {/* Product Mockup */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Browser chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-left border border-gray-200">
                  app.siteclause.io/dashboard
                </div>
              </div>
              {/* Mock app content */}
              <div className="bg-white p-6">
                {/* Mock nav */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-black"><span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">mike@example.com</span>
                    <span className="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">Sign Out</span>
                  </div>
                </div>
                {/* Mock header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-base font-black text-gray-900">My Projects</div>
                    <div className="text-xs text-gray-400 mt-0.5">Track variations, deadlines, and contract claims</div>
                  </div>
                  <div className="bg-[#111] text-white text-xs rounded-full px-4 py-2">+ New Project</div>
                </div>
                {/* Mock project cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Oakfield Rise — Civil Works', mc: 'Bradstone Construction', value: '£2,850,000', vars: 7, status: 'Active' },
                    { name: 'Harbour Gate Tower B', mc: 'Connell Group', value: '£1,200,000', vars: 3, status: 'Active' },
                    { name: 'Westfield Retail Fit-Out', mc: 'Murphy & Sons', value: '£680,000', vars: 1, status: 'On Hold' },
                  ].map((p) => (
                    <div key={p.name} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900 leading-tight mb-1">{p.name}</div>
                      <div className="text-xs text-gray-400 mb-3">{p.mc}</div>
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                        <span>{p.value}</span>
                        <span>{p.vars} variations</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="bg-white border-y border-gray-100 py-14">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-0 divide-x divide-gray-100 text-center">
          {[
            { value: '3–5%', label: 'of contract value lost to unclaimed variations' },
            { value: '< 2 min', label: 'from upload to full claim analysis' },
            { value: '0', label: 'lawyers or QS needed to get your entitlement' },
          ].map((s) => (
            <div key={s.value} className="px-8 py-4">
              <div className="text-4xl font-black text-gray-900 mb-2">{s.value}</div>
              <div className="text-sm text-gray-500 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                label: 'Variation Tracking',
                heading: 'Every claim, automatically identified.',
                desc: 'SiteClause reads every page of your contract and correspondence, flagging variation events, valuing them, and tracking their status — so nothing slips through.',
              },
              {
                label: 'Notice Drafting',
                heading: 'Formal notices drafted in seconds.',
                desc: 'Generate contractually compliant variation notices, extension of time claims, and loss & expense letters — ready to review and send.',
              },
              {
                label: 'Ask Your Contract',
                heading: 'Plain English answers from your actual contract.',
                desc: 'Ask any question about your contract in plain language. What are my notice deadlines? Can I claim delay damages? What does clause 5.3 mean?',
              },
            ].map((f) => (
              <div key={f.label} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{f.label}</p>
                <h3 className="text-xl font-black text-gray-900 leading-tight">{f.heading}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="bg-[#FAFAFA] border-y border-gray-100 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-14">
            What happens without SiteClause
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Without */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Without SiteClause</span>
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
                    <span className="text-gray-300 mt-0.5 text-sm flex-shrink-0">✗</span>
                    <span className="text-sm text-gray-600">{t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-center text-xs text-gray-500 font-medium">
                Industry estimate: 3–5% of contract value lost
              </div>
            </div>
            {/* With */}
            <div className="rounded-2xl border-2 border-gray-900 overflow-hidden shadow-md">
              <div className="bg-gray-900 border-b border-gray-800 px-5 py-3">
                <span className="text-xs font-bold text-white uppercase tracking-widest">With SiteClause</span>
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
                    <span className="text-gray-900 mt-0.5 text-sm flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-600">{t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 border-t border-gray-800 px-5 py-3 text-center text-xs text-white font-medium">
                Full entitlement recovered — in 2 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Login Section ── */}
      <section id="login-section" className="bg-[#F5F5F5] py-24 px-6">
        <div className="max-w-md mx-auto">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-4">
              <div className="text-xl font-black mb-1">
                <span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span>
              </div>
              <p className="text-sm text-gray-400">Sign in or create your account to get started</p>
            </div>

            {/* Tabs */}
            {mode !== 'forgot' && (
              <div className="px-8 pb-2">
                <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                  {(['login', 'signup'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); clearState() }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
                        mode === m
                          ? 'bg-[#111] text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {m === 'login' ? 'Log In' : 'Sign Up'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-8 pb-8 pt-4">
              {mode === 'forgot' ? (
                <>
                  <h3 className="font-black text-gray-900 text-base mb-1">Reset your password</h3>
                  <p className="text-gray-400 text-sm mb-5">Enter your email and we'll send a reset link.</p>
                  <form onSubmit={handleForgot} className="space-y-3">
                    <input
                      type="email" placeholder="Email address" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full transition-colors text-sm disabled:opacity-60"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                      type="button" onClick={() => { setMode('login'); clearState() }}
                      className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
                    >
                      ← Back to Log In
                    </button>
                  </form>
                </>
              ) : mode === 'login' ? (
                <>
                  <h3 className="font-black text-gray-900 text-base mb-5">Welcome back</h3>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <input
                      type="email" placeholder="Email address" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <input
                      type="password" placeholder="Password" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full transition-colors text-sm disabled:opacity-60"
                    >
                      {loading ? 'Logging in...' : 'Log In →'}
                    </button>
                    <button
                      type="button" onClick={() => { setMode('forgot'); clearState() }}
                      className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
                    >
                      Forgot password?
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="font-black text-gray-900 text-base mb-1">Create your account</h3>
                  <p className="text-gray-400 text-sm mb-5">Free to start. No credit card required.</p>
                  <form onSubmit={handleSignup} className="space-y-3">
                    <input
                      type="email" placeholder="Email address" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <input
                      type="password" placeholder="Password (min. 6 characters)" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    {message && <p className="text-green-600 text-sm">{message}</p>}
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-[#111] hover:bg-[#333] text-white font-semibold py-3 rounded-full transition-colors text-sm disabled:opacity-60"
                    >
                      {loading ? 'Creating account...' : 'Create Account →'}
                    </button>
                  </form>
                </>
              )}

              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <a href="/demo" className="text-sm text-gray-500 hover:text-gray-700">
                  Try the demo without an account →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-black">
            <span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span>
          </div>
          <div className="text-sm text-gray-400">hello@siteclause.io</div>
        </div>
      </footer>
    </div>
  )
}

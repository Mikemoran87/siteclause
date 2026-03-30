import { useState } from 'react'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    // Store in localStorage for now — can wire to a backend later
    const existing = JSON.parse(localStorage.getItem('siteclause_waitlist') || '[]')
    existing.push({ email, date: new Date().toISOString() })
    localStorage.setItem('siteclause_waitlist', JSON.stringify(existing))
    await new Promise(r => setTimeout(r, 600))
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-6 py-4">
        <span className="text-amber-400 text-xl">✓</span>
        <div className="text-left">
          <div className="text-white font-bold text-sm">You're on the list</div>
          <div className="text-gray-400 text-xs mt-0.5">We'll be in touch when full project tracking goes live.</div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap disabled:opacity-60"
      >
        {loading ? '...' : 'Get Early Access'}
      </button>
    </form>
  )
}

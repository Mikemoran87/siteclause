import { useState } from 'react'
import type { AnalysisResult } from '../../types'
import { saveLead } from '../../lib/leads'

interface Props {
  results: AnalysisResult
  contractValueBand: string
  workType: string
  answers: Record<string, string>
  onSubmit: (name: string, email: string) => void
}

export default function EmailCaptureStep({
  results,
  contractValueBand,
  workType,
  answers,
  onSubmit,
}: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const claimCount = results.claims?.length ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your first name.'); return }
    if (!email.trim()) { setError('Please enter your email.'); return }
    setError('')
    setLoading(true)
    await saveLead({ name, email, contractValueBand, workType, answers, analysisResult: results })
    setLoading(false)
    onSubmit(name, email)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md">
        {/* Teaser badge */}
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 mb-8 text-center">
          <div className="text-2xl mb-1">🎯</div>
          <div className="font-black text-gray-900 text-lg mb-1">Your report is ready.</div>
          <div className="text-gray-500 text-sm">
            We found{' '}
            <span className="font-bold text-gray-900">{claimCount} potential variation claim{claimCount !== 1 ? 's' : ''}</span>
            {results.totalClaimValue ? (
              <> worth an estimated{' '}<span className="font-bold text-gray-900">{results.totalClaimValue}</span></>
            ) : null}
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Enter your email to see it</h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          No spam. No credit card. We'll follow up to help you claim what you're owed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="First name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111] hover:bg-[#333] text-white font-bold py-4 rounded-full text-base transition-colors disabled:opacity-60 min-h-[52px]"
          >
            {loading ? 'Saving…' : 'Show me my report →'}
          </button>
        </form>
      </div>
    </div>
  )
}

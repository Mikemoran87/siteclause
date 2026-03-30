import { useState } from 'react'
import type { AnalysisResult, Claim } from '../types'

interface Props {
  results: AnalysisResult
  onReset: () => void
}

const severityConfig = {
  urgent: { label: 'URGENT', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  valid: { label: 'VALID CLAIM', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  review: { label: 'REVIEW', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
}

const deadlineConfig = {
  expired: { label: '⚑ EXPIRED — ACT NOW', color: 'text-red-600 font-bold' },
  urgent: { label: '⚑ DEADLINE URGENT', color: 'text-amber-600 font-bold' },
  'on-track': { label: '✓ ON TRACK', color: 'text-green-600 font-bold' },
}

function ClaimCard({ claim }: { claim: Claim }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = severityConfig[claim.severity]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} uppercase tracking-wide`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">{claim.clause}</span>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-black text-amber-500">{claim.estimatedValue}</div>
          </div>
        </div>
        <h3 className="font-bold text-gray-900 mb-1">{claim.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-3">{claim.description}</p>
        <div className="text-xs text-gray-400 mb-4">{claim.deadlineStatus}</div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
        >
          {expanded ? '▲ Hide draft notice' : '▼ View draft notice'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-amber-100 bg-amber-50 p-5">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">
            AI-Drafted Variation Notice — Ready to Send
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-4 font-serif text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {claim.draftNotice}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(claim.draftNotice)}
            className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-800 border border-amber-300 bg-white rounded-lg px-3 py-1.5 transition-colors"
          >
            📋 Copy to clipboard
          </button>
        </div>
      )}
    </div>
  )
}

export default function Results({ results, onReset }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-black text-amber-500 tracking-tight">
          Site<span className="text-gray-900">Clause</span>
        </div>
        <button
          onClick={onReset}
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-4 py-2 transition-colors"
        >
          ← Analyse Another Contract
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Summary banner */}
        <div className="bg-amber-500 rounded-2xl p-6 mb-8 text-white shadow-lg shadow-amber-200">
          <div className="text-sm font-semibold opacity-80 mb-1 uppercase tracking-widest">Analysis Complete</div>
          <div className="text-4xl font-black mb-2">{results.totalClaimValue}</div>
          <div className="text-sm opacity-90 font-medium">in variation claims identified across {results.claims.length} events</div>
          <div className="mt-4 text-sm opacity-75 leading-relaxed">{results.summary}</div>
        </div>

        {/* Deadline tracker */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-8">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-widest">Contract Notice Tracker</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {results.deadlines.map((d, i) => {
              const cfg = deadlineConfig[d.status]
              return (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{d.clause}</div>
                    <div className="text-sm text-gray-700 mt-0.5">{d.description}</div>
                  </div>
                  <div className={`text-xs flex-shrink-0 ${cfg.color}`}>{cfg.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Claims */}
        <h2 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-sm">
          Variation Claims — {results.claims.length} identified
        </h2>
        <div className="space-y-4">
          {results.claims.map(claim => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 bg-gray-900 rounded-2xl p-8 text-center text-white">
          <div className="text-xl font-black mb-2">Want SiteClause on every project?</div>
          <p className="text-gray-400 text-sm mb-6">Get automatic claim tracking, deadline alerts, and notice drafting across all your active contracts.</p>
          <a
            href="mailto:hello@siteclause.io?subject=SiteClause Early Access"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
          >
            Get Early Access →
          </a>
        </div>
      </div>
    </div>
  )
}

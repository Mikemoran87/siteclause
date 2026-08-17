import { useState, useEffect } from 'react'
import type { AnalysisResult, Claim } from '../types'
import ContractChat from '../components/ContractChat'

interface Props {
  results: AnalysisResult
  onReset: () => void
}

const severityConfig = {
  urgent: { label: 'URGENT', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  valid: { label: 'VALID CLAIM', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  review: { label: 'REVIEW', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
}

function ClaimCard({ claim }: { claim: Claim }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = severityConfig[claim.severity]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} uppercase tracking-wide`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">{claim.clause}</span>
          </div>
          <div className="font-black text-amber-500 text-lg">{claim.estimatedValue}</div>
        </div>
        <h3 className="font-bold text-gray-900 mb-1">{claim.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-3">{claim.description}</p>
        <p className="text-xs text-gray-400 mb-4">{claim.deadlineStatus}</p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
        >
          {expanded ? '▲ Hide draft notice' : '▼ View draft notice'}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-amber-100 bg-amber-50 p-5">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">Draft Notice — Ready to Send</div>
          <div className="bg-white border border-amber-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
            {claim.draftNotice}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(claim.draftNotice)}
            className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-800 border border-amber-300 bg-white rounded-lg px-3 py-1.5 transition-colors"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  )
}

export default function Results({ results, onReset }: Props) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  const urgentCount = results.claims.filter(c => c.severity === 'urgent').length

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — matches homepage */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="text-2xl font-black text-amber-500 tracking-tight">
          Site<span className="text-gray-900">Clause</span>
        </div>
        <button onClick={onReset} className="text-sm font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-4 py-2 transition-colors">
          Analyse Another Contract
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Summary banner */}
        <div className="bg-amber-500 rounded-2xl p-8 mb-8 text-white shadow-lg shadow-amber-100">
          <div className="text-xs font-bold uppercase tracking-widest opacity-75 mb-2">Analysis Complete</div>
          <div className="text-5xl font-black mb-2">{results.totalClaimValue}</div>
          <div className="text-base font-semibold opacity-90 mb-4">in variation claims identified across {results.claims.length} event{results.claims.length !== 1 ? 's' : ''}</div>
          {urgentCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 text-sm font-bold mb-4">
              ⚠️ {urgentCount} claim{urgentCount !== 1 ? 's' : ''} require immediate notice
            </div>
          )}
          <p className="text-sm opacity-80 leading-relaxed">{results.summary}</p>
        </div>

        {/* Deadline tracker */}
        {results.deadlines.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest">Notice Deadlines</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {results.deadlines.map((d, i) => {
                const isExpired = d.status === 'expired'
                const isUrgent = d.status === 'urgent'
                return (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{d.clause}</div>
                      <div className="text-sm text-gray-700 mt-0.5">{d.description}</div>
                    </div>
                    <div className={`text-xs font-bold flex-shrink-0 ${isExpired ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-green-600'}`}>
                      {isExpired ? 'EXPIRED — ACT NOW' : isUrgent ? 'DEADLINE URGENT' : 'ON TRACK'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Claims list */}
        <h2 className="font-black text-gray-900 mb-4 uppercase tracking-widest text-xs">
          {results.claims.length} Variation Claim{results.claims.length !== 1 ? 's' : ''} Found
        </h2>
        <div className="space-y-4 mb-10">
          {results.claims.map(claim => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>

        {/* Contract Chat */}
        <div className="mb-10">
          <h2 className="font-black text-gray-900 mb-4 uppercase tracking-widest text-xs">Ask Your Contract</h2>
          <ContractChat contractText={results.contractText || ''} projectName={results.projectName} />
        </div>

        {/* CTA */}
        <div className="bg-gray-900 rounded-2xl p-8 text-center text-white">
          <div className="text-xl font-black mb-2">Want SiteClause on every project?</div>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">Automatic claim tracking, deadline alerts, and notice drafting across all your active contracts.</p>
          <a href="mailto:hello@siteclause.io?subject=SiteClause Early Access" className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
            Get Early Access
          </a>
        </div>
      </div>
    </div>
  )
}

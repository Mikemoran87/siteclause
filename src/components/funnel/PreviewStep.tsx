import type { AnalysisResult, Claim } from '../../types'

interface Props {
  results: AnalysisResult
  name: string
}

const SEVERITY_COLOURS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  valid: 'bg-green-100 text-green-700',
  review: 'bg-amber-100 text-amber-700',
}

function ClaimCard({ claim, locked }: { claim: Claim; locked: boolean }) {
  return (
    <div className={`relative border rounded-2xl p-5 bg-white ${locked ? 'border-gray-100' : 'border-gray-200'}`}>
      {locked && (
        <div className="absolute inset-0 rounded-2xl backdrop-blur-sm bg-white/70 z-10 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="text-2xl mb-1">🔒</div>
            <div className="text-xs font-bold text-gray-500">Create a free account to unlock</div>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-gray-900 text-sm leading-snug">{claim.title}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${SEVERITY_COLOURS[claim.severity] ?? 'bg-gray-100 text-gray-600'}`}>
          {claim.severity}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3 leading-relaxed">{claim.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
        <span className="font-medium">Clause {claim.clause}</span>
        <span className="font-bold text-gray-700">{claim.estimatedValue}</span>
      </div>
    </div>
  )
}

export default function PreviewStep({ results, name }: Props) {
  const claims = results.claims ?? []
  const visibleClaims = claims.slice(0, 2)
  const lockedClaims = claims.slice(2)
  const lockedCount = lockedClaims.length

  // Estimate locked value (rough sum placeholder)
  const lockedValue = results.totalClaimValue && lockedCount > 0
    ? `an estimated portion of ${results.totalClaimValue}`
    : null

  const goToSignup = () => {
    window.location.href = '/#login-section'
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm text-amber-600 font-bold mb-2">Hey {name} 👋</div>
        <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2">
          Here's what we found
        </h1>
        <p className="text-gray-500 text-sm">
          {claims.length} variation claim{claims.length !== 1 ? 's' : ''} identified
          {results.totalClaimValue ? ` · Estimated total: ${results.totalClaimValue}` : ''}.
        </p>
      </div>

      {/* Project meta */}
      {results.projectName && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 flex items-center justify-between text-sm">
          <span className="text-gray-500">Project</span>
          <span className="font-semibold text-gray-800">{results.projectName}</span>
        </div>
      )}

      {/* Visible claims */}
      <div className="space-y-4 mb-4">
        {visibleClaims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} locked={false} />
        ))}
      </div>

      {/* Locked claims */}
      {lockedCount > 0 && (
        <>
          <div className="space-y-4 mb-6">
            {lockedClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} locked />
            ))}
          </div>

          <div className="bg-[#F5F5F5] rounded-2xl p-6 text-center mb-6">
            <div className="font-black text-gray-900 text-lg mb-1">
              {lockedCount} more claim{lockedCount !== 1 ? 's' : ''} found
            </div>
            {lockedValue && (
              <p className="text-sm text-gray-500 mb-4">{lockedValue}</p>
            )}
            <button
              onClick={goToSignup}
              className="w-full bg-[#111] hover:bg-[#333] text-white font-bold py-3.5 rounded-full text-sm transition-colors"
            >
              Create your free account to unlock all claims →
            </button>
          </div>
        </>
      )}

      {/* CTA if no locked */}
      {lockedCount === 0 && (
        <div className="bg-[#F5F5F5] rounded-2xl p-6 text-center mb-6">
          <div className="font-black text-gray-900 text-lg mb-1">Want to track and action these?</div>
          <p className="text-sm text-gray-500 mb-4">Save your report, draft notices, and track deadlines.</p>
          <button
            onClick={goToSignup}
            className="w-full bg-[#111] hover:bg-[#333] text-white font-bold py-3.5 rounded-full text-sm transition-colors"
          >
            Create your free account →
          </button>
        </div>
      )}

      {/* Secondary CTA */}
      <div className="text-center">
        <a
          href="mailto:hello@siteclause.io"
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Talk to us →
        </a>
      </div>
    </div>
  )
}

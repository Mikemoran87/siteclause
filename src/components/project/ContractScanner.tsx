import { useState } from 'react'
import { getContracts, getCorrespondence, getRateCard, clearVariationsBySource, saveVariation } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
  contractVOCount: number
  onComplete: () => void
}

function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return result
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function ContractScanner({ projectId, userId, contractVOCount, onComplete }: Props) {
  const [analysing, setAnalysing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')

  const handleAnalyse = async () => {
    setAnalysing(true)
    setMsg('')
    try {
      const allContracts = await getContracts(projectId)
      if (allContracts.length === 0) throw new Error('No contract uploaded — upload a contract in the Contract tab first')

      const contractText = allContracts
        .map(c => `=== ${c.doc_type ?? 'Document'}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`)
        .join('\n\n')

      const corrItems = await getCorrespondence(projectId)
      const correspondenceText = corrItems.map(c => c.content).filter(Boolean).join('\n\n---\n\n')

      const rates = await getRateCard(projectId)
      const rateContext = rates.length > 0
        ? `PROJECT RATE CARD — use these exact rates:\n${rates.map(r => `- ${r.description}: €${r.rate} per ${r.unit}`).join('\n')}`
        : ''

      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText, correspondenceText, rateContext }),
      })
      const result = await response.json() as {
        claims?: Array<{ title: string; description: string; estimatedValue: string; deadlineStatus: string; draftNotice: string }>
        error?: string
      }
      if (!response.ok || result.error) throw new Error(result.error ?? `Server error ${response.status}`)

      const claims = result.claims ?? []
      await clearVariationsBySource(projectId, 'contract')
      const today = new Date()
      for (const claim of claims) {
        const n1 = addWorkingDays(today, 20)
        const n2 = addWorkingDays(n1, 20)
        const monthly = new Date(today)
        monthly.setMonth(monthly.getMonth() + 1)
        await saveVariation(projectId, userId, {
          title: claim.title,
          description: claim.description,
          value: claim.estimatedValue,
          status: 'Draft',
          deadline: claim.deadlineStatus,
          notice_drafted: claim.draftNotice ?? '',
          source: 'contract',
          claim_date: toDateStr(today),
          notice_1_due: toDateStr(n1),
          notice_1_sent: false,
          notice_2_due: toDateStr(n2),
          notice_2_sent: false,
          next_monthly_due: toDateStr(monthly),
        })
      }
      setMsg(`✅ Found ${claims.length} variation claim${claims.length !== 1 ? 's' : ''}${rates.length === 0 ? ' — add a day rate in 💰 Rates tab for £ values' : ''}`)
      onComplete()
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : String(err)}`)
    }
    setAnalysing(false)
  }

  const handleReset = async () => {
    if (!confirm('Clear all Variation Order claims and start again?')) return
    setResetting(true)
    await clearVariationsBySource(projectId, 'contract')
    setMsg('')
    onComplete()
    setResetting(false)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">📄 Contract & Correspondence Scanner</div>
      <p className="text-xs text-amber-700">AI reads your contract + all correspondence and finds every Variation Order, Compensation Event, and claim you're entitled to.</p>
      {msg && <p className="text-sm font-semibold text-gray-700">{msg}</p>}
      <button
        onClick={handleAnalyse}
        disabled={analysing}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black py-4 rounded-xl text-base transition-colors min-h-[56px] flex items-center justify-center gap-2"
      >
        {analysing ? (
          <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Analysing…</>
        ) : '🔍 Find Variation Claims'}
      </button>
      {contractVOCount > 0 && (
        <button onClick={handleReset} disabled={resetting}
          className="w-full border border-amber-300 text-amber-700 bg-white hover:bg-amber-50 font-semibold py-2.5 rounded-xl text-sm min-h-[44px]">
          {resetting ? 'Clearing…' : '🔄 Reset & Start Again'}
        </button>
      )}
    </div>
  )
}

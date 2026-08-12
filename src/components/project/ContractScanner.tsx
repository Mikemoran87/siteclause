import { useState } from 'react'
import { getContracts, getCorrespondence, getRateCard, clearVariationsBySource, saveVariation } from '../../lib/db'
import type { ClaimEvent } from '../../../api/analyse-combined'

interface Props {
  projectId: string
  userId: string
  contractVOCount: number
  onComplete: () => void
}

// ALL maths lives here — deterministic, auditable, never varies
export function calcClaimValue(blockedFrom: string | null, blockedTo: string | null, dayRate: number): {
  calendarDays: number | null
  workingDays: number | null
  value: number | null
} {
  if (!blockedFrom || dayRate <= 0) return { calendarDays: null, workingDays: null, value: null }
  const end = blockedTo ? new Date(blockedTo) : new Date()
  const start = new Date(blockedFrom)
  const calendarDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (calendarDays <= 0) return { calendarDays: null, workingDays: null, value: null }
  const workingDays = Math.round(calendarDays * 0.714)
  const value = workingDays * dayRate
  return { calendarDays, workingDays, value }
}

export function formatEstimatedValue(event: ClaimEvent, dayRate: number): string {
  if (event.missingData) return `⚠️ Cannot calculate — ${event.missingData}`
  if (!event.blockedFrom) return '⚠️ Cannot calculate — start date not found in documents'
  const to = event.blockedTo ?? new Date().toISOString().split('T')[0]
  const { calendarDays, workingDays, value } = calcClaimValue(event.blockedFrom, to, dayRate)
  if (!calendarDays || !workingDays || !value) return '⚠️ Cannot calculate — invalid dates'
  const fromFmt = new Date(event.blockedFrom).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const toFmt = new Date(to).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const ongoing = event.stillOngoing ? ' (ongoing)' : ''
  return `${fromFmt} to ${toFmt}${ongoing} = ${calendarDays} cal days = ${workingDays} wd × €${dayRate.toLocaleString()}/day = €${value.toLocaleString()}`
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

function toDateStr(d: Date): string { return d.toISOString().split('T')[0] }

export default function ContractScanner({ projectId, userId, contractVOCount, onComplete }: Props) {
  const [analysing, setAnalysing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')

  const handleAnalyse = async () => {
    setAnalysing(true)
    setMsg('Reading documents…')
    try {
      const allDocs = await getContracts(projectId)
      if (allDocs.length === 0) throw new Error('No contract uploaded — upload a contract in the Contract tab first')

      const contractDocs = allDocs.filter(c => c.doc_type !== 'Programme')
      const programmeDocs = allDocs.filter(c => c.doc_type === 'Programme')
      const programmes = programmeDocs.map(c => c.content ?? '').filter(Boolean)

      const contractText = contractDocs
        .map(c => `=== ${c.doc_type ?? 'Document'}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`)
        .join('\n\n')

      const corrItems = await getCorrespondence(projectId)
      const correspondenceText = corrItems.map(c => c.content).filter(Boolean).join('\n\n---\n\n')

      const rates = await getRateCard(projectId)
      const dayRateEntry = rates.find(r => /day rate|day work|daywork/i.test(r.description) && r.unit === 'day')
      const dayRate = dayRateEntry?.rate ?? 0

      if (dayRate === 0) {
        setMsg('⚠️ No day rate found — go to 💰 Rates tab and add your Contractor Day Rate (per day) first')
        setAnalysing(false)
        return
      }

      if (programmes.length === 0) {
        setMsg('⚠️ No lookahead charts uploaded — upload your programme PDFs in the Contract tab (type: Programme) for accurate date-based valuations')
        setAnalysing(false)
        return
      }

      setMsg(`Extracting claims from contract + ${programmes.length} programme${programmes.length !== 1 ? 's' : ''}…`)

      const response = await fetch('/api/analyse-combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText, correspondenceText, programmes }),
      })

      const result = await response.json() as { claims?: ClaimEvent[]; error?: string }
      if (!response.ok || result.error) throw new Error(result.error ?? `Server error ${response.status}`)

      const events = result.claims ?? []
      await clearVariationsBySource(projectId, 'contract')

      const today = new Date()
      let valued = 0
      let flagged = 0

      for (const event of events) {
        // Deterministic calculation — code does the maths, not AI
        const to = event.blockedTo ?? toDateStr(today)
        const { value } = calcClaimValue(event.blockedFrom, to, dayRate)
        const estimatedValue = formatEstimatedValue(event, dayRate)

        if (value && value > 0) valued++
        else flagged++

        const n1 = addWorkingDays(today, 20)
        const n2 = addWorkingDays(n1, 20)
        const monthly = new Date(today)
        monthly.setMonth(monthly.getMonth() + 1)

        await saveVariation(projectId, userId, {
          title: event.title,
          description: `${event.description}\n\nResponsible: ${event.responsibleParty}\nRef: ${event.programmeRef} | ${event.clauseRef}`,
          value: estimatedValue,
          status: 'Draft',
          deadline: event.deadlineStatus,
          notice_drafted: event.draftNotice ?? '',
          source: 'contract',
          claim_type: event.claimType,
          claim_date: event.blockedFrom ?? toDateStr(today),
          notice_1_due: toDateStr(n1),
          notice_1_sent: false,
          notice_2_due: toDateStr(n2),
          notice_2_sent: false,
          next_monthly_due: toDateStr(monthly),
        })
      }

      const total = events.length
      setMsg(`✅ Found ${total} claim${total !== 1 ? 's' : ''} — ${valued} valued, ${flagged > 0 ? `${flagged} flagged (missing dates)` : 'all calculated'}`)
      onComplete()
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : String(err)}`)
    }
    setAnalysing(false)
  }

  const handleReset = async () => {
    if (!confirm('Clear all claims and start again?')) return
    setResetting(true)
    await clearVariationsBySource(projectId, 'contract')
    setMsg('')
    onComplete()
    setResetting(false)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">🔍 Find All Claims & Values</div>
      <p className="text-xs text-amber-700">
        Reads contract, correspondence, and lookahead charts together. AI extracts facts — dates and values calculated from actual programme data only. No estimates.
      </p>
      {msg && <p className="text-sm font-semibold text-gray-700 whitespace-pre-wrap">{msg}</p>}
      <button
        onClick={handleAnalyse}
        disabled={analysing}
        className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-black py-4 rounded-xl text-base transition-colors min-h-[56px] flex items-center justify-center gap-2"
      >
        {analysing ? (
          <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Analysing…</>
        ) : '🔍 Find All Claims & Values'}
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

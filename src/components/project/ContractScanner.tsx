import { useState } from 'react'
import { getContracts, getCorrespondence, getRateCard, clearVariationsBySource, saveVariation } from '../../lib/db'
import { parseProgramme } from '../../lib/parseProgramme'
import type { ClaimRef } from '../../../api/analyse-combined'

interface Props {
  projectId: string
  userId: string
  contractVOCount: number
  onComplete: () => void
}

function getTaskDates(taskId: string | null, tasks: { id: string; start: string | null; finish: string | null; durationDays: number }[]): { start: string | null; finish: string | null; durationDays: number } {
  if (!taskId) return { start: null, finish: null, durationDays: -1 }
  const task = tasks.find(t => t.id === taskId)
  return { start: task?.start ?? null, finish: task?.finish ?? null, durationDays: task?.durationDays ?? -1 }
}

export function calcValue(blockedFrom: string, blockedTo: string, dayRate: number): {
  calendarDays: number; workingDays: number; value: number; working: string
} {
  const start = new Date(blockedFrom)
  const end = new Date(blockedTo)
  const calendarDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const workingDays = Math.round(calendarDays * 0.714)
  const value = workingDays * dayRate
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const working = `${fmt(blockedFrom)} to ${fmt(blockedTo)} = ${calendarDays} cal days = ${workingDays} wd x €${dayRate.toLocaleString()}/day = €${value.toLocaleString()}`
  return { calendarDays, workingDays, value, working }
}

function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) added++
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
    setMsg('Reading documents...')
    try {
      const allDocs = await getContracts(projectId)
      if (allDocs.length === 0) throw new Error('No contract uploaded — upload a contract in the Contract tab first')

      const contractDocs = allDocs.filter(c => c.doc_type !== 'Programme')
      const programmeDocs = allDocs.filter(c => c.doc_type === 'Programme')
      const programmes = programmeDocs.map(c => c.content ?? '').filter(Boolean)

      const rates = await getRateCard(projectId)
      const dayRateEntry = rates.find(r => /day.?rate|day.?work/i.test(r.description) && /day|wd/i.test(r.unit))
      const dayRate = dayRateEntry?.rate ?? 0

      const contractText = contractDocs
        .map(c => `=== ${c.doc_type}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`)
        .join('\n\n')
      const corrItems = await getCorrespondence(projectId)
      const correspondenceText = corrItems.map(c => c.content).filter(Boolean).join('\n\n---\n\n')

      await clearVariationsBySource(projectId, 'contract')
      const today = new Date()

      if (programmes.length > 0) {
        // PATH A: Programmes uploaded — task ID lookup + deterministic date calculation
        setMsg(`Scanning contract + ${programmes.length} lookahead chart${programmes.length !== 1 ? 's' : ''}...`)
        const parsedProgs = programmes.map(p => parseProgramme(p))

        const response = await fetch('/api/analyse-combined', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractText, correspondenceText, programmes }),
        })
        const result = await response.json() as { claims?: ClaimRef[]; error?: string }
        if (!response.ok || result.error) throw new Error(result.error ?? `Server error ${response.status}`)

        const claimRefs = result.claims ?? []
        let valued = 0, flagged = 0

        const prog2LatestDate = parsedProgs[parsedProgs.length - 1]?.tasks
          .map(t => t.finish).filter(Boolean).sort().pop() ?? null

        for (const ref of claimRefs) {
          const prog1Tasks = parsedProgs[0]?.tasks ?? []
          const prog2Tasks = parsedProgs[parsedProgs.length - 1]?.tasks ?? []
          const from1 = getTaskDates(ref.prog1TaskId, prog1Tasks)
          const from2 = getTaskDates(ref.prog2TaskId, prog2Tasks)
          const blockedFrom = from1.start ?? from2.start ?? null
          const isZeroDur = (from2.durationDays >= 0 ? from2.durationDays : from1.durationDays) === 0
          const blockedTo = isZeroDur
            ? (prog2LatestDate ?? from2.finish ?? from1.finish ?? null)
            : (from2.finish ?? from1.finish ?? null)

          let estimatedValue = ''
          if (ref.missingData) { estimatedValue = `⚠️ Cannot calculate — ${ref.missingData}`; flagged++ }
          else if (!blockedFrom && dayRate > 0) {
            // No programme dates for this task — fall back to AI estimate from description
            const daysMatch = ref.description.match(/(\d+)\s*(?:calendar\s*)?days?/i)
            const days = daysMatch ? parseInt(daysMatch[1]) : null
            if (days && days > 0) {
              const wd = Math.round(days * 0.714)
              estimatedValue = `Est. ${days} cal days = ${wd} wd x €${dayRate.toLocaleString()}/day = €${(wd * dayRate).toLocaleString()} (days from description)`
              valued++
            } else {
              estimatedValue = `⚠️ Requires programme dates — upload lookahead charts as type: Programme`
              flagged++
            }
          }
          else if (!blockedFrom) { estimatedValue = `⚠️ Requires programme dates — upload lookahead charts as type: Programme`; flagged++ }
          else if (dayRate === 0) { estimatedValue = `⚠️ Dates found but no day rate — add day rate in 💰 Rates tab`; flagged++ }
          else {
            const to = blockedTo ?? toDateStr(today)
            const { value, working } = calcValue(blockedFrom, to, dayRate)
            estimatedValue = value > 0 ? working : `⚠️ Dates resulted in 0 days`
            if (value > 0) valued++; else flagged++
          }

          const n1 = addWorkingDays(today, 20), n2 = addWorkingDays(n1, 20)
          const monthly = new Date(today); monthly.setMonth(monthly.getMonth() + 1)
          await saveVariation(projectId, userId, {
            title: ref.title,
            description: `${ref.description}\n\nResponsible: ${ref.responsibleParty}\n${ref.clauseRef}`,
            value: estimatedValue, status: 'Draft', deadline: ref.deadlineStatus,
            notice_drafted: ref.draftNotice ?? '', source: 'contract', claim_type: ref.claimType,
            claim_date: blockedFrom ?? toDateStr(today),
            notice_1_due: toDateStr(n1), notice_1_sent: false,
            notice_2_due: toDateStr(n2), notice_2_sent: false,
            next_monthly_due: toDateStr(monthly),
          })
        }

        const total = claimRefs.length
        const flagMsg = flagged > 0 ? `, ${flagged} need programme dates` : ''
        setMsg(`✅ ${total} claim${total !== 1 ? 's' : ''} — ${valued} valued${flagMsg}`)

      } else {
        // PATH B: No programme — use /api/analyse (estimates from contract + correspondence)
        setMsg('Scanning contract and correspondence...')
        const rateContext = dayRate > 0
          ? `PROJECT RATE CARD:\n- Contractor Day Rate: €${dayRate} per day`
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
        for (const claim of claims) {
          const n1 = addWorkingDays(today, 20), n2 = addWorkingDays(n1, 20)
          const monthly = new Date(today); monthly.setMonth(monthly.getMonth() + 1)
          await saveVariation(projectId, userId, {
            title: claim.title, description: claim.description, value: claim.estimatedValue,
            status: 'Draft', deadline: claim.deadlineStatus, notice_drafted: claim.draftNotice ?? '',
            source: 'contract', claim_date: toDateStr(today),
            notice_1_due: toDateStr(n1), notice_1_sent: false,
            notice_2_due: toDateStr(n2), notice_2_sent: false,
            next_monthly_due: toDateStr(monthly),
          })
        }
        setMsg(`✅ ${claims.length} claim${claims.length !== 1 ? 's' : ''} found — upload lookahead charts (type: Programme) for accurate date valuations`)
      }

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
    <div className="bg-[#1B4332] rounded-xl p-4 space-y-2">
      <div className="text-xs font-bold text-white uppercase tracking-wide">🔍 Find All Claims & Values</div>
      <p className="text-xs text-green-200">
        Reads your contract, correspondence, and lookahead charts together. AI identifies every claim — values calculated from actual programme dates. Same input, same answer every time.
      </p>
      <div className="bg-white/10 rounded-lg px-3 py-2 text-xs text-green-100">
        Upload lookahead charts in the <strong className="text-white">Contract tab</strong> (type: Programme) for accurate date-based valuations. Without them, estimates come from the contract text.
      </div>
      {msg && <p className="text-sm font-semibold text-green-100 whitespace-pre-wrap">{msg}</p>}
      <button
        onClick={handleAnalyse}
        disabled={analysing}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black py-4 rounded-xl text-base transition-colors min-h-[56px] flex items-center justify-center gap-2"
      >
        {analysing ? (
          <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Analysing...</>
        ) : '🔍 Find All Claims & Values'}
      </button>
      {contractVOCount > 0 && (
        <button onClick={handleReset} disabled={resetting}
          className="w-full border border-white/30 text-white bg-white/10 hover:bg-white/20 font-semibold py-2.5 rounded-xl text-sm min-h-[44px]">
          {resetting ? 'Clearing...' : '🔄 Reset & Start Again'}
        </button>
      )}
    </div>
  )
}

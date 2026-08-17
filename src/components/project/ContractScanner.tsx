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

// Deterministic date lookup from parsed programme tasks
function getTaskDates(taskId: string | null, tasks: { id: string; start: string | null; finish: string | null }[]): { start: string | null; finish: string | null } {
  if (!taskId) return { start: null, finish: null }
  const task = tasks.find(t => t.id === taskId)
  return { start: task?.start ?? null, finish: task?.finish ?? null }
}

// ALL maths here — deterministic, auditable
export function calcValue(blockedFrom: string, blockedTo: string, dayRate: number): {
  calendarDays: number; workingDays: number; value: number; working: string
} {
  const start = new Date(blockedFrom)
  const end = new Date(blockedTo)
  const calendarDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const workingDays = Math.round(calendarDays * 0.714)
  const value = workingDays * dayRate
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const working = `${fmt(blockedFrom)} → ${fmt(blockedTo)} = ${calendarDays} cal days = ${workingDays} wd × €${dayRate.toLocaleString()}/day = €${value.toLocaleString()}`
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
    setMsg('Reading documents…')
    try {
      const allDocs = await getContracts(projectId)
      if (allDocs.length === 0) throw new Error('No contract uploaded — upload a contract in the Contract tab first')

      const contractDocs = allDocs.filter(c => c.doc_type !== 'Programme')
      const programmeDocs = allDocs.filter(c => c.doc_type === 'Programme')

      if (programmeDocs.length === 0) {
        setMsg('⚠️ No lookahead charts found — upload your programme PDFs in the Contract tab (type: Programme) for date-based valuations')
        setAnalysing(false)
        return
      }

      const rates = await getRateCard(projectId)
      const dayRateEntry = rates.find(r => /day.?rate|day.?work/i.test(r.description) && /day|wd/i.test(r.unit))
      const dayRate = dayRateEntry?.rate ?? 0

      if (dayRate === 0) {
        setMsg('⚠️ No day rate found — go to 💰 Rates tab and add your Contractor Day Rate (per day)')
        setAnalysing(false)
        return
      }

      const contractText = contractDocs.map(c => `=== ${c.doc_type}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`).join('\n\n')
      const programmes = programmeDocs.map(c => c.content ?? '').filter(Boolean)

      const corrItems = await getCorrespondence(projectId)
      const correspondenceText = corrItems.map(c => c.content).filter(Boolean).join('\n\n---\n\n')

      setMsg(`Identifying claims from contract + ${programmes.length} lookahead chart${programmes.length !== 1 ? 's' : ''}…`)

      // Parse all programme task tables — deterministic
      const parsedProgs = programmes.map(p => parseProgramme(p))

      const response = await fetch('/api/analyse-combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText, correspondenceText, programmes }),
      })

      const result = await response.json() as { claims?: ClaimRef[]; error?: string }
      if (!response.ok || result.error) throw new Error(result.error ?? `Server error ${response.status}`)

      const claimRefs = result.claims ?? []
      await clearVariationsBySource(projectId, 'contract')

      const today = new Date()
      let valued = 0
      let flagged = 0

      for (const ref of claimRefs) {
        // Look up exact dates from parsed programme data by task ID
        const prog1Tasks = parsedProgs[0]?.tasks ?? []
        const prog2Tasks = parsedProgs[parsedProgs.length - 1]?.tasks ?? []

        const from1 = getTaskDates(ref.prog1TaskId, prog1Tasks)
        const from2 = getTaskDates(ref.prog2TaskId, prog2Tasks)

        // blockedFrom = earliest start date found
        const blockedFrom = from1.start ?? from2.start ?? null

        // blockedTo logic:
        // - If task has meaningful duration in Prog 2: use its finish date
        // - If task is zero-duration milestone in latest prog: still ongoing →
        //   use latest programme's overall end date (last finish date in programme)
        const prog2LatestDate = parsedProgs[parsedProgs.length - 1]?.tasks
          .map(t => t.finish).filter(Boolean).sort().pop() ?? null
        const t2 = prog2Tasks.find(t => t.id === ref.prog2TaskId)
        const t1 = prog1Tasks.find(t => t.id === ref.prog1TaskId)
        const isZeroDur = (t2?.durationDays ?? t1?.durationDays ?? 0) === 0
        // Zero-duration milestone = still blocked as of latest programme date
        const blockedTo = isZeroDur
          ? (prog2LatestDate ?? from2.finish ?? from1.finish ?? null)
          : (from2.finish ?? from1.finish ?? null)

        let estimatedValue = ''
        if (ref.missingData) {
          estimatedValue = `⚠️ Cannot calculate — ${ref.missingData}`
          flagged++
        } else if (!blockedFrom) {
          estimatedValue = `⚠️ Cannot calculate — task dates not found in programme (Task IDs: P1:${ref.prog1TaskId ?? 'n/a'} P2:${ref.prog2TaskId ?? 'n/a'})`
          flagged++
        } else {
          const to = blockedTo ?? toDateStr(today)
          const { value, working } = calcValue(blockedFrom, to, dayRate)
          estimatedValue = value > 0 ? working : `⚠️ Cannot calculate — dates resulted in 0 days (${blockedFrom} → ${to})`
          if (value > 0) valued++
          else flagged++
        }

        const n1 = addWorkingDays(today, 20)
        const n2 = addWorkingDays(n1, 20)
        const monthly = new Date(today)
        monthly.setMonth(monthly.getMonth() + 1)

        await saveVariation(projectId, userId, {
          title: ref.title,
          description: `${ref.description}\n\nResponsible: ${ref.responsibleParty}\n${ref.clauseRef}`,
          value: estimatedValue,
          status: 'Draft',
          deadline: ref.deadlineStatus,
          notice_drafted: ref.draftNotice ?? '',
          source: 'contract',
          claim_type: ref.claimType,
          claim_date: blockedFrom ?? toDateStr(today),
          notice_1_due: toDateStr(n1),
          notice_1_sent: false,
          notice_2_due: toDateStr(n2),
          notice_2_sent: false,
          next_monthly_due: toDateStr(monthly),
        })
      }

      const total = claimRefs.length
      const flagMsg = flagged > 0 ? `, ${flagged} flagged (missing dates — check task IDs)` : ''
      setMsg(`✅ ${total} claim${total !== 1 ? 's' : ''} found — ${valued} valued${flagMsg}`)
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
        Reads your contract, correspondence, and lookahead charts together. AI identifies every claim — dates and values calculated from actual programme data. Same input, same answer every time.
      </p>
      <div className="bg-white/10 rounded-lg px-3 py-2 text-xs text-green-100">
        💡 Upload your lookahead charts in the <strong className="text-white">Contract tab</strong> first (type: Programme) for accurate date-based valuations.
      </div>
      {msg && <p className="text-sm font-semibold text-gray-700 whitespace-pre-wrap">{msg}</p>}
      <button
        onClick={handleAnalyse}
        disabled={analysing}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black py-4 rounded-xl text-base transition-colors min-h-[56px] flex items-center justify-center gap-2"
      >
        {analysing ? (
          <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Analysing…</>
        ) : '🔍 Find All Claims & Values'}
      </button>
      {contractVOCount > 0 && (
        <button onClick={handleReset} disabled={resetting}
          className="w-full border border-white/30 text-white bg-white/10 hover:bg-white/20 font-semibold py-2.5 rounded-xl text-sm min-h-[44px]">
          {resetting ? 'Clearing…' : '🔄 Reset & Start Again'}
        </button>
      )}
    </div>
  )
}

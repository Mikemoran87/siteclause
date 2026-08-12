import { useState } from 'react'
import { getContracts, getRateCard, clearVariationsBySource, saveVariation } from '../../lib/db'
import { parseFileToText } from '../../lib/parseFile'

interface Props {
  projectId: string
  userId: string
  progClaimCount: number
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

export default function LookaheadScanner({ projectId, userId, progClaimCount, onComplete }: Props) {
  const [queued, setQueued] = useState<File[]>([])
  const [scanning, setScanning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState('')

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setQueued(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...files.filter(f => !existing.has(f.name))]
    })
    setMsg('')
    e.target.value = ''
  }

  const removeFile = (name: string) => setQueued(prev => prev.filter(f => f.name !== name))

  const handleScan = async () => {
    if (!queued.length) return
    setScanning(true)
    setMsg('')
    try {
      const newProgrammes = await Promise.all(queued.map(f => parseFileToText(f)))

      const allDocs = await getContracts(projectId)
      const savedProgrammes = allDocs.filter(c => c.doc_type === 'Programme').map(c => c.content ?? '').filter(Boolean)
      const allProgrammes = [...savedProgrammes, ...newProgrammes]

      const contractDocs = allDocs.filter(c => c.doc_type !== 'Programme')
      const contractText = contractDocs.map(c => `=== ${c.doc_type}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`).join('\n\n')

      const rates = await getRateCard(projectId)
      const rateContext = rates.length > 0
        ? `PROJECT RATE CARD — use these exact rates:\n${rates.map(r => `- ${r.description}: €${r.rate} per ${r.unit}`).join('\n')}`
        : ''

      if (rates.length === 0) {
        setMsg('⚠️ No day rate found — add one in 💰 Rates tab for accurate values. Scanning anyway…')
      }

      const response = await fetch('/api/analyse-programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programmes: allProgrammes, contractText, rateContext }),
      })
      const result = await response.json() as {
        claims?: Array<{ title: string; description: string; estimatedValue: string; deadlineStatus: string; draftNotice: string; claimType?: string }>
        error?: string
      }
      if (!response.ok || result.error) throw new Error(result.error ?? `Server error ${response.status}`)

      const claims = result.claims ?? []
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
          source: 'programme',
          claim_type: claim.claimType ?? 'Compensation Event',
          claim_date: toDateStr(today),
          notice_1_due: toDateStr(n1),
          notice_1_sent: false,
          notice_2_due: toDateStr(n2),
          notice_2_sent: false,
          next_monthly_due: toDateStr(monthly),
        })
      }
      setMsg(`✅ Found ${claims.length} claim${claims.length !== 1 ? 's' : ''} from ${allProgrammes.length} lookahead chart${allProgrammes.length !== 1 ? 's' : ''}`)
      setQueued([])
      onComplete()
    } catch (err: unknown) {
      setMsg(`❌ ${err instanceof Error ? err.message : String(err)}`)
    }
    setScanning(false)
  }

  const handleReset = async () => {
    if (!confirm('Clear all Lookahead Chart claims and start again?')) return
    setResetting(true)
    await clearVariationsBySource(projectId, 'programme')
    setMsg('')
    onComplete()
    setResetting(false)
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
      <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">📊 Lookahead Chart Analyser</div>
      <p className="text-xs text-blue-700">Upload your lookahead charts. The AI compares across all versions and finds every Compensation Event, Variation Order, and Additional Works claim.</p>

      {queued.length > 0 && (
        <div className="space-y-1.5">
          {queued.map(f => (
            <div key={f.name} className="flex items-center justify-between bg-blue-100 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-blue-800 truncate">{f.name}</span>
              <button onClick={() => removeFile(f.name)} className="text-blue-500 hover:text-red-500 text-lg ml-2 leading-none">×</button>
            </div>
          ))}
        </div>
      )}

      {msg && <p className="text-sm font-semibold text-gray-700">{msg}</p>}

      <label className={`w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 text-blue-700 font-bold py-3 rounded-xl text-sm cursor-pointer hover:bg-blue-100 min-h-[48px] ${scanning ? 'opacity-50 pointer-events-none' : ''}`}>
        + Add Lookahead Chart{queued.length > 0 ? ' (add more)' : ''}
        <input type="file" accept=".pdf,.txt,.xlsx,.xls,.csv,.doc,.docx" onChange={addFiles} className="hidden" multiple disabled={scanning} />
      </label>

      {queued.length > 0 && (
        <button onClick={handleScan} disabled={scanning}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl text-base min-h-[56px] flex items-center justify-center gap-2">
          {scanning ? (
            <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Scanning…</>
          ) : `📊 Scan ${queued.length} Chart${queued.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {progClaimCount > 0 && (
        <button onClick={handleReset} disabled={resetting}
          className="w-full border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 font-semibold py-2.5 rounded-xl text-sm min-h-[44px]">
          {resetting ? 'Clearing…' : '🔄 Reset & Start Again'}
        </button>
      )}
    </div>
  )
}

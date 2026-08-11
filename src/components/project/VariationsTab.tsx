import { useState, useEffect } from 'react'
import { getVariations, saveVariation, updateVariation, updateVariationStatus, deleteVariation, clearVariations, getContracts, getCorrespondence, getRateCard, getProject } from '../../lib/db'
import type { Variation, VariationInput } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
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

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function DeadlineBadge({ label, due, sent, onMarkSent }: {
  label: string
  due: string
  sent?: boolean
  onMarkSent: () => void
}) {
  const days = daysUntil(due)
  const formatted = new Date(due).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })

  if (sent) {
    return (
      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
        ✅ {label} sent
      </span>
    )
  }

  const urgent = days <= 3
  const overdue = days < 0

  return (
    <button
      onClick={e => { e.stopPropagation(); onMarkSent() }}
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
        overdue
          ? 'bg-red-600 text-white border-red-600'
          : urgent
            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
            : 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
      title={`Mark ${label} as sent`}
    >
      {overdue ? `⚠️ ${label} OVERDUE` : `📅 ${label} due ${formatted}${days <= 7 ? ` (${days}d)` : ''}`}
    </button>
  )
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Sent: 'bg-blue-100 text-blue-700',
  Agreed: 'bg-green-100 text-green-700',
  Disputed: 'bg-red-100 text-red-700',
}

const STATUSES = ['Draft', 'Sent', 'Agreed', 'Disputed']

interface CostCalc {
  labourHours: string
  labourRate: string
  materials: string
  overhead: string
}

function calcTotal(c: CostCalc): number {
  const hours = parseFloat(c.labourHours) || 0
  const rate = parseFloat(c.labourRate) || 0
  const mats = parseFloat(c.materials) || 0
  const oh = parseFloat(c.overhead) || 0
  const subtotal = (hours * rate) + mats
  return subtotal * (1 + oh / 100)
}

export default function VariationsTab({ projectId, userId }: Props) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCalc, setShowCalc] = useState<string | null>(null)
  const [calc, setCalc] = useState<CostCalc>({ labourHours: '', labourRate: '', materials: '', overhead: '15' })
  const [analysing, setAnalysing] = useState(false)
  const [analyseMsg, setAnalyseMsg] = useState('')
  const [progAnalysing, setProgAnalysing] = useState(false)
  const [progMsg, setProgMsg] = useState('')
  const [projectRates, setProjectRates] = useState<import('../../lib/db').Rate[]>([])
  const [projectName, setProjectName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [form, setForm] = useState<VariationInput>({
    title: '',
    description: '',
    value: '',
    status: 'Draft',
    deadline: '',
    notice_drafted: '',
  })
  const [formCalc, setFormCalc] = useState<CostCalc>({ labourHours: '', labourRate: '', materials: '', overhead: '15' })

  useEffect(() => {
    load()
    getRateCard(projectId).then(setProjectRates)
    getProject(projectId).then(p => { if (p) setProjectName(p.name) })
  }, [projectId])

  const handleAnalyse = async () => {
    setAnalysing(true)
    setAnalyseMsg('')
    try {
      const allContracts = await getContracts(projectId)
      if (allContracts.length === 0) throw new Error('No contract uploaded yet — please upload a contract first')
      // Combine all contract documents with labels
      const contractText = allContracts
        .map(c => `=== ${c.doc_type ?? 'Document'}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`)
        .join('\n\n')
      const corrItems = await getCorrespondence(projectId)
      const correspondenceText = corrItems.map(c => c.content).filter(Boolean).join('\n\n---\n\n')

      // Include rate card so AI uses project-specific rates
      const rates = await getRateCard(projectId)
      const rateContext = rates.length > 0
        ? `\n\nPROJECT RATE CARD (use these rates when calculating variation values):\n` +
          rates.map(r => `- ${r.category} / ${r.description}: €${r.rate} per ${r.unit}`).join('\n')
        : ''

      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText: contractText + rateContext, correspondenceText }),
      })
      if (!response.ok) throw new Error('Analysis failed')
      const result = await response.json() as { claims?: Array<{ title: string; description: string; estimatedValue: string; deadlineStatus: string; draftNotice: string }> }
      const claims = result.claims ?? []
      // Clear existing AI-found variations before saving fresh results
      await clearVariations(projectId)
      const today = new Date()
      for (const claim of claims) {
        const notice1Due = addWorkingDays(today, 20)
        const notice2Due = addWorkingDays(notice1Due, 20)
        const monthlyDue = new Date(today)
        monthlyDue.setMonth(monthlyDue.getMonth() + 1)
        await saveVariation(projectId, userId, {
          title: claim.title,
          description: claim.description,
          value: claim.estimatedValue,
          status: 'Draft',
          deadline: claim.deadlineStatus,
          notice_drafted: claim.draftNotice ?? '',
          claim_date: toDateStr(today),
          notice_1_due: toDateStr(notice1Due),
          notice_1_sent: false,
          notice_2_due: toDateStr(notice2Due),
          notice_2_sent: false,
          next_monthly_due: toDateStr(monthlyDue),
        })
      }
      await load()
      setAnalyseMsg(`✅ Found ${claims.length} variation claim${claims.length !== 1 ? 's' : ''}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setAnalyseMsg(`❌ ${msg}`)
    }
    setAnalysing(false)
  }

  const handleProgrammeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setProgAnalysing(true)
    setProgMsg('')
    try {
      const { parseFileToText } = await import('../../lib/parseFile')

      // Parse all uploaded files
      const newProgrammes = await Promise.all(files.map(f => parseFileToText(f)))

      // Also get previously saved programmes from contract docs
      const allDocs = await getContracts(projectId)
      const savedProgrammes = allDocs
        .filter(c => c.doc_type === 'Programme')
        .map(c => c.content ?? '')
        .filter(Boolean)

      // All programmes in one list — saved first (oldest), new ones last
      const allProgrammes = [...savedProgrammes, ...newProgrammes]

      // Non-programme docs for contract context
      const contractDocs = allDocs.filter(c => c.doc_type !== 'Programme')
      const combinedContractText = contractDocs
        .map(c => `=== ${c.doc_type ?? 'Document'}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`)
        .join('\n\n')

      const rates = await getRateCard(projectId)
      const rateContext = rates.length > 0
        ? `\n\nPROJECT RATE CARD:\n${rates.map(r => `- ${r.description}: €${r.rate} per ${r.unit}`).join('\n')}`
        : ''

      const totalProgrammes = allProgrammes.length
      setProgMsg(`Analysing ${totalProgrammes} programme${totalProgrammes !== 1 ? 's' : ''}…`)

      const response = await fetch('/api/analyse-programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmes: allProgrammes,
          programmeText: allProgrammes[0] ?? '',
          contractText: combinedContractText,
          rateContext,
        }),
      })

      const result = await response.json() as { claims?: Array<{ title: string; description: string; estimatedValue: string; deadlineStatus: string; draftNotice: string }> ; error?: string }
      if (!response.ok || result.error) throw new Error(result.error ?? 'Analysis failed')

      const claims = result.claims ?? []
      const todayProg = new Date()
      for (const claim of claims) {
        const n1 = addWorkingDays(todayProg, 20)
        const n2 = addWorkingDays(n1, 20)
        const monthly = new Date(todayProg)
        monthly.setMonth(monthly.getMonth() + 1)
        await saveVariation(projectId, userId, {
          title: claim.title,
          description: claim.description,
          value: claim.estimatedValue,
          status: 'Draft',
          deadline: claim.deadlineStatus,
          notice_drafted: claim.draftNotice ?? '',
          claim_date: toDateStr(todayProg),
          notice_1_due: toDateStr(n1),
          notice_1_sent: false,
          notice_2_due: toDateStr(n2),
          notice_2_sent: false,
          next_monthly_due: toDateStr(monthly),
        })
      }
      await load()
      setProgMsg(`✅ Found ${claims.length} delay claim${claims.length !== 1 ? 's' : ''} from programme`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setProgMsg(`❌ ${msg}`)
    }
    setProgAnalysing(false)
    e.target.value = ''
  }

  const load = async () => {
    setLoading(true)
    const data = await getVariations(projectId)
    setVariations(data)
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Auto-generate a formal notice if one hasn't been written
    let notice = form.notice_drafted
    if (!notice && form.title) {
      try {
        const today = new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Draft a formal variation notice for a construction subcontract. Be concise and professional.

Variation title: ${form.title}
Description: ${form.description || 'See title'}
Value: ${form.value || 'To be agreed'}
Date: ${today}

Write a short formal notice (3-4 sentences) that the subcontractor sends to the main contractor asserting their entitlement to this variation under the subcontract. Reference the instruction received and the contractual basis. Do not include placeholders — use the information provided.`
            }],
            contractText: ''
          }),
        })
        const data = await resp.json() as { reply?: string }
        if (data.reply) notice = data.reply
      } catch { /* leave blank if fails */ }
    }

    const todayManual = new Date()
    const n1m = addWorkingDays(todayManual, 20)
    const n2m = addWorkingDays(n1m, 20)
    const monthlyM = new Date(todayManual)
    monthlyM.setMonth(monthlyM.getMonth() + 1)
    await saveVariation(projectId, userId, {
      ...form,
      notice_drafted: notice,
      claim_date: toDateStr(todayManual),
      notice_1_due: toDateStr(n1m),
      notice_1_sent: false,
      notice_2_due: toDateStr(n2m),
      notice_2_sent: false,
      next_monthly_due: toDateStr(monthlyM),
    })
    setForm({ title: '', description: '', value: '', status: 'Draft', deadline: '', notice_drafted: '' })
    setShowAdd(false)
    await load()
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateVariationStatus(id, status)
    setVariations(prev => prev.map(v => v.id === id ? { ...v, status } : v))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this variation?')) return
    await deleteVariation(id)
    setVariations(prev => prev.filter(v => v.id !== id))
  }

  const handleMarkSent = async (id: string, type: 'notice_1' | 'notice_2') => {
    const patch = type === 'notice_1'
      ? { notice_1_sent: true }
      : { notice_2_sent: true }
    await updateVariation(id, patch)
    setVariations(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  const handleRollMonthly = async (id: string, currentDue: string) => {
    const next = new Date(currentDue)
    next.setMonth(next.getMonth() + 1)
    const patch = { next_monthly_due: toDateStr(next) }
    await updateVariation(id, patch)
    setVariations(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  const handleStartAdjust = (v: Variation) => {
    setEditingId(v.id)
    setEditTitle(v.title ?? '')
    setEditValue((v.value ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '').match(/\d+(\.\d+)?/)?.[0] ?? '')
  }

  const handleSaveAdjust = async (id: string) => {
    const formatted = editValue ? `€${parseFloat(editValue).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ''
    await updateVariation(id, { title: editTitle, value: formatted })
    setVariations(prev => prev.map(v => v.id === id ? { ...v, title: editTitle, value: formatted } : v))
    setEditingId(null)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  const parseValue = (val: string): number => {
    // Extract first number with optional comma separators: e.g. "Est. €10,000" → 10000
    const match = val.replace(/,/g, '').match(/\d+(\.\d+)?/)
    return match ? parseFloat(match[0]) : 0
  }
  const totalValue = variations
    .filter(v => v.value)
    .map(v => parseValue(v.value ?? ''))
    .filter(n => n > 0)
    .reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Summary bar */}
      {variations.length > 0 && (
        <div className="bg-[#1B4332] text-white rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-green-200">{variations.length} variation{variations.length !== 1 ? 's' : ''} tracked</span>
          {totalValue > 0 && (
            <span className="font-black text-amber-400 text-base md:text-lg">
              €{totalValue.toLocaleString()} estimated
            </span>
          )}
        </div>
      )}

      {/* Find Variations Button */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        {analyseMsg && (
          <p className="text-sm font-semibold mb-3 text-gray-700">{analyseMsg}</p>
        )}
        <button
          onClick={handleAnalyse}
          disabled={analysing}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black py-4 rounded-xl text-base transition-colors min-h-[56px] flex items-center justify-center gap-2"
        >
          {analysing ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Analysing contract and correspondence…
            </>
          ) : (
            '🔍 Find Variation Claims'
          )}
        </button>
        <p className="text-xs text-amber-700 mt-2 text-center">
          AI reads your contract + correspondence and finds every claim you're entitled to
        </p>
      </div>

      {/* Programme Upload */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        {progMsg && (
          <p className="text-sm font-semibold mb-3 text-gray-700">{progMsg}</p>
        )}
        <label className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl text-base transition-colors min-h-[56px] cursor-pointer ${progAnalysing ? 'opacity-60 pointer-events-none' : ''}`}>
          {progAnalysing ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Scanning programme for delay claims…
            </>
          ) : (
            '📊 Scan Programme for Delays'
          )}
          <input
            type="file"
            accept=".pdf,.txt,.xlsx,.xls,.csv,.doc,.docx"
            onChange={handleProgrammeUpload}
            className="hidden"
            disabled={progAnalysing}
            multiple
          />
        </label>
        <p className="text-xs text-blue-700 mt-2 text-center">
          Upload one or more programmes — AI correlates across all of them and compares what's moved
        </p>
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="w-full md:w-auto md:ml-auto md:flex bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px] flex items-center justify-center"
      >
        + Add Variation Manually
      </button>

      {variations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-bold text-gray-700 mb-1">No variations yet</h3>
          <p className="text-sm text-gray-400">Track every variation claim — value, status, and deadline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {variations.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {v.status}
                    </span>
                    {editingId === v.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder="Value €"
                        className="text-amber-600 font-bold text-sm border border-amber-300 rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      v.value && <span className="text-amber-600 font-bold text-sm">{v.value}</span>
                    )}
                  </div>
                  {editingId === v.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="font-semibold text-gray-900 text-sm border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-green-400"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div className="font-semibold text-gray-900 text-sm">{v.title || 'Untitled variation'}</div>
                  )}
                  {v.deadline && (
                    <div className="text-xs text-red-500 mt-0.5">⏰ {v.deadline}</div>
                  )}
                  {/* Deadline tracker */}
                  {v.notice_1_due && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <DeadlineBadge
                        label="Notice 1"
                        due={v.notice_1_due}
                        sent={v.notice_1_sent}
                        onMarkSent={() => handleMarkSent(v.id, 'notice_1')}
                      />
                      {v.notice_2_due && (
                        <DeadlineBadge
                          label="Notice 2"
                          due={v.notice_2_due}
                          sent={v.notice_2_sent}
                          onMarkSent={() => handleMarkSent(v.id, 'notice_2')}
                        />
                      )}
                      {v.next_monthly_due && (
                        <DeadlineBadge
                          label="Monthly"
                          due={v.next_monthly_due}
                          sent={false}
                          onMarkSent={() => handleRollMonthly(v.id, v.next_monthly_due!)}
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                  {editingId !== v.id && (
                    <select
                      value={v.status}
                      onChange={e => handleStatusChange(v.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none min-h-[36px]"
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  )}
                  {editingId === v.id ? (
                    <>
                      <button
                        onClick={() => handleSaveAdjust(v.id)}
                        className="text-xs text-white bg-[#1B4332] rounded-lg px-2.5 py-2 min-h-[44px] flex items-center font-semibold"
                      >Save</button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-2 min-h-[44px] flex items-center"
                      >Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                        className="text-xs text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-2.5 py-2 min-h-[44px] flex items-center"
                      >
                        {expanded === v.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => handleStartAdjust(v)}
                        className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-2 min-h-[44px] flex items-center"
                      >Adjust</button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="text-xs text-red-400 border border-red-200 rounded-lg px-2.5 py-2 min-h-[44px] flex items-center"
                      >Del</button>
                    </>
                  )}
                </div>
              </div>
              {expanded === v.id && (
                <div className="border-t border-gray-100 px-4 md:px-5 py-4 space-y-4">
                  {v.description && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</div>
                      <p className="text-sm text-gray-700">{v.description}</p>
                    </div>
                  )}

                  {/* Cost Calculator */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">💰 Cost Calculator</div>
                      <button
                        onClick={() => {
                          if (showCalc === v.id) { setShowCalc(null) } else {
                            setShowCalc(v.id)
                            const text = (v.description ?? '') + ' ' + (v.notice_drafted ?? '')

                            // Labour hours from description
                            const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:man[\s-]?)?(?:hours?|hrs?)/i)
                            const hours = hoursMatch ? hoursMatch[1] : ''

                            // Labour rate: prefer rate card labourer rate, fallback to parsing description
                            const rateFromText = text.match(/€(\d+(?:\.\d+)?)\/hr|(\d+(?:\.\d+)?)\s*per\s*hour/i)
                            const labourRateFromCard = projectRates.find(r =>
                              r.category === 'Labour' && /labourer|operative|general/i.test(r.description)
                            )
                            const overtimeMatch = text.match(/overtime/i)
                            const rate = rateFromText
                              ? (rateFromText[1] || rateFromText[2])
                              : overtimeMatch
                                ? ''  // overtime rate must be explicit
                                : labourRateFromCard ? String(labourRateFromCard.rate) : ''

                            // Overhead from rate card if available
                            const ohRate = projectRates.find(r => /overhead/i.test(r.description))
                            const oh = ohRate ? String(ohRate.rate) : '15'

                            // No materials estimate — leave blank for Pat to fill
                            setCalc({ labourHours: hours, labourRate: rate, materials: '', overhead: oh })
                          }
                        }}
                        className="text-xs text-[#1B4332] font-semibold min-h-[44px] flex items-center"
                      >
                        {showCalc === v.id ? 'Hide' : 'Calculate →'}
                      </button>
                    </div>
                    {showCalc === v.id && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Labour hours</label>
                            <input type="number" min="0" placeholder="0" value={calc.labourHours}
                              onChange={e => setCalc(c => ({ ...c, labourHours: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Labour rate (€/hr)</label>
                            <input type="number" min="0" placeholder="0" value={calc.labourRate}
                              onChange={e => setCalc(c => ({ ...c, labourRate: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Materials (€)</label>
                            <input type="number" min="0" placeholder="0" value={calc.materials}
                              onChange={e => setCalc(c => ({ ...c, materials: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-[#1B4332]" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Overhead %</label>
                            <input type="number" min="0" max="100" placeholder="15" value={calc.overhead}
                              onChange={e => setCalc(c => ({ ...c, overhead: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-[#1B4332]" />
                          </div>
                        </div>
                        {calcTotal(calc) > 0 && (
                          <div className="bg-[#1B4332] text-white rounded-lg px-4 py-3 flex items-center justify-between">
                            <span className="text-sm font-semibold">Estimated value</span>
                            <span className="text-xl font-black text-amber-400">
                              €{calcTotal(calc).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Labour: €{((parseFloat(calc.labourHours)||0) * (parseFloat(calc.labourRate)||0)).toFixed(0)} + Materials: €{(parseFloat(calc.materials)||0).toFixed(0)} + Overhead ({calc.overhead}%)
                        </div>
                      </div>
                    )}
                  </div>

                  {v.notice_drafted && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Draft Notice</div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 font-serif text-sm text-gray-700 whitespace-pre-wrap">
                        {v.notice_drafted}
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <button
                          onClick={() => navigator.clipboard.writeText(v.notice_drafted ?? '')}
                          className="text-xs text-amber-700 border border-amber-300 rounded-lg px-3 py-2 min-h-[44px] flex items-center"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => {
                            const subject = encodeURIComponent(`Variation Notice — ${v.title}${projectName ? ` — ${projectName}` : ''}`)
                            const body = encodeURIComponent(v.notice_drafted ?? '')
                            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                          }}
                          className="text-xs text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg px-3 py-2 min-h-[44px] flex items-center gap-1"
                        >
                          ✉️ Send Email
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal — bottom sheet on mobile */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowAdd(false)} />
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">Add Variation</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl min-h-[44px] flex items-center">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 md:p-6 space-y-4 pb-8">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eastern boundary drainage relocation"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="What happened, when, and what was instructed"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Estimated Value</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="e.g. €8,500"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                  <button type="button" onClick={() => setFormCalc(c => ({ ...c, labourHours: c.labourHours ? '' : '0' }))}
                    className="text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-500 hover:bg-gray-50 min-h-[44px]">
                    🧮
                  </button>
                </div>
                {/* Inline calc */}
                <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Labour hrs', key: 'labourHours', placeholder: '0' },
                      { label: 'Rate €/hr', key: 'labourRate', placeholder: '45' },
                      { label: 'Materials €', key: 'materials', placeholder: '0' },
                      { label: 'Overhead %', key: 'overhead', placeholder: '15' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-400 mb-0.5">{f.label}</label>
                        <input type="number" min="0" placeholder={f.placeholder}
                          value={formCalc[f.key as keyof CostCalc]}
                          onChange={e => setFormCalc(c => ({ ...c, [f.key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-base focus:outline-none focus:ring-1 focus:ring-[#1B4332]" />
                      </div>
                    ))}
                  </div>
                  {calcTotal(formCalc) > 0 && (
                    <div className="flex items-center justify-between bg-[#1B4332] text-white rounded-lg px-3 py-2">
                      <span className="text-xs">Calculated value</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-400">
                          €{calcTotal(formCalc).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <button type="button"
                          onClick={() => setForm(f => ({ ...f, value: `€${calcTotal(formCalc).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }))}
                          className="text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-0.5">
                          Use →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Deadline</label>
                  <input
                    type="text"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    placeholder="e.g. 14 days"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Draft Notice (optional)</label>
                <textarea
                  value={form.notice_drafted}
                  onChange={e => setForm(f => ({ ...f, notice_drafted: e.target.value }))}
                  rows={4}
                  placeholder="Paste or type the draft formal notice text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono"
                />
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="w-full md:w-auto text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 min-h-[44px]"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full md:w-auto bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm min-h-[44px]"
                >
                  {saving ? 'Saving…' : 'Add Variation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

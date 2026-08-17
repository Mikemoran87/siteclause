import { useState, useEffect } from 'react'
import { getVariations, saveVariation, updateVariation, updateVariationStatus, deleteVariation, getProject } from '../../lib/db'
import type { Variation, VariationInput } from '../../lib/db'
import ContractScanner from './ContractScanner'
import VariationCard from './VariationCard'

const STATUSES = ['Draft', 'Sent', 'Agreed', 'Disputed']

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


export default function VariationsTab({ projectId, userId }: Props) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
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

  useEffect(() => {
    load()
    getProject(projectId).then(p => { if (p) setProjectName(p.name) })
  }, [projectId])

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
    // Normalise EUR -> € then find all amounts, take the largest
    const clean = val.replace(/,/g, '').replace(/EUR(\d)/g, '€$1').replace(/EUR\s/g, '€')
    const euroMatches = [...clean.matchAll(/€(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]))
    if (euroMatches.length > 0) return Math.max(...euroMatches)
    // Fallback: first number
    const match = clean.match(/\d+(\.\d+)?/)
    return match ? parseFloat(match[0]) : 0
  }
  const sumValues = (vs: Variation[]) =>
    vs.filter(v => v.value).map(v => parseValue(v.value ?? '')).filter(n => n > 0).reduce((a, b) => a + b, 0)

  const contractVOs = variations.filter(v => v.source === 'contract')
  const programmeDelays = variations.filter(v => v.source === 'programme')
  const manualVOs = variations.filter(v => !v.source || v.source === 'manual')

  const totalValue = sumValues(variations)
  const contractTotal = sumValues(contractVOs)
  const programmeTotal = sumValues(programmeDelays)
  const manualTotal = sumValues(manualVOs)

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Summary bar */}
      {variations.length > 0 && (
        <div className="bg-[#1B4332] text-white rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-200">{variations.length} claim{variations.length !== 1 ? 's' : ''} tracked</span>
            {totalValue > 0 && (
              <span className="font-black text-amber-400 text-lg">
                €{totalValue.toLocaleString()} total
              </span>
            )}
          </div>
          {(contractTotal + manualTotal > 0 || programmeTotal > 0) && (
            <div className="flex gap-3 flex-wrap border-t border-green-800 pt-2">
              {contractTotal + manualTotal > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-green-300">📄 Variation Orders</span>
                  <span className="text-sm font-black text-amber-300">€{(contractTotal + manualTotal).toLocaleString()}</span>
                </div>
              )}
              {programmeTotal > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-green-300">📊 Delay / Compensation</span>
                  <span className="text-sm font-black text-blue-300">€{programmeTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ContractScanner
        projectId={projectId}
        userId={userId}
        contractVOCount={contractVOs.length}
        onComplete={load}
      />

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
          <p className="text-sm text-gray-400">Use the buttons above to find claims from your contract, correspondence, or programmes.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Section 1: Contract & Correspondence VOs */}
          {(contractVOs.length > 0 || manualVOs.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-black text-gray-900 text-sm">📄 Variation Orders — Contract & Correspondence</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Found from your subcontract, emails and WhatsApp</p>
                </div>
                {contractTotal + manualTotal > 0 && (
                  <span className="font-black text-amber-600 text-sm">€{(contractTotal + manualTotal).toLocaleString()}</span>
                )}
              </div>
              <div className="space-y-3">
                {[...contractVOs, ...manualVOs].map((v) => (
                  <VariationCard
                    key={v.id}
                    v={v}
                    expanded={expanded === v.id}
                    editingId={editingId}
                    editTitle={editTitle}
                    editValue={editValue}
                    onToggleExpand={() => setExpanded(expanded === v.id ? null : v.id)}
                    onStatusChange={(s) => handleStatusChange(v.id, s)}
                    onDelete={() => handleDelete(v.id)}
                    onStartAdjust={() => handleStartAdjust(v)}
                    onSaveAdjust={() => handleSaveAdjust(v.id)}
                    onCancelAdjust={() => setEditingId(null)}
                    onEditTitleChange={setEditTitle}
                    onEditValueChange={setEditValue}
                    onMarkSent={(type) => handleMarkSent(v.id, type)}
                    onRollMonthly={() => handleRollMonthly(v.id, v.next_monthly_due!)}
                    onCopyNotice={() => navigator.clipboard.writeText(v.notice_drafted ?? '')}
                    onEmailNotice={() => {
                      const subject = encodeURIComponent(`Variation Notice — ${v.title}${projectName ? ` — ${projectName}` : ''}`)
                      const body = encodeURIComponent(v.notice_drafted ?? '')
                      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Delay & Compensation Claims */}
          {programmeDelays.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-black text-gray-900 text-sm">📊 Delay & Compensation Claims</h3>
                  <p className="text-xs text-gray-400 mt-0.5">From contract + lookahead chart analysis</p>
                </div>
                {programmeTotal > 0 && (
                  <span className="font-black text-blue-600 text-sm">€{programmeTotal.toLocaleString()}</span>
                )}
              </div>
              <div className="space-y-3">
                {programmeDelays.map((v) => (
                  <VariationCard
                    key={v.id}
                    v={v}
                    expanded={expanded === v.id}
                    editingId={editingId}
                    editTitle={editTitle}
                    editValue={editValue}
                    onToggleExpand={() => setExpanded(expanded === v.id ? null : v.id)}
                    onStatusChange={(s) => handleStatusChange(v.id, s)}
                    onDelete={() => handleDelete(v.id)}
                    onStartAdjust={() => handleStartAdjust(v)}
                    onSaveAdjust={() => handleSaveAdjust(v.id)}
                    onCancelAdjust={() => setEditingId(null)}
                    onEditTitleChange={setEditTitle}
                    onEditValueChange={setEditValue}
                    onMarkSent={(type) => handleMarkSent(v.id, type)}
                    onRollMonthly={() => handleRollMonthly(v.id, v.next_monthly_due!)}
                    onCopyNotice={() => navigator.clipboard.writeText(v.notice_drafted ?? '')}
                    onEmailNotice={() => {
                      const subject = encodeURIComponent(`Compensation Event Notice — ${v.title}${projectName ? ` — ${projectName}` : ''}`)
                      const body = encodeURIComponent(v.notice_drafted ?? '')
                      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                    }}
                  />
                ))}
              </div>
            </div>
          )}

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

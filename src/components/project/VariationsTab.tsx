import { useState, useEffect } from 'react'
import { getVariations, saveVariation, updateVariationStatus, deleteVariation } from '../../lib/db'
import type { Variation, VariationInput } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
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
    await saveVariation(projectId, userId, form)
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
    await load()
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  const totalValue = variations
    .filter(v => v.value)
    .map(v => parseFloat((v.value ?? '').replace(/[^0-9.]/g, '')))
    .filter(n => !isNaN(n))
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

      <button
        onClick={() => setShowAdd(true)}
        className="w-full md:w-auto md:ml-auto md:flex bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px] flex items-center justify-center"
      >
        + Add Variation
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
                    {v.value && <span className="text-amber-600 font-bold text-sm">{v.value}</span>}
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">{v.title || 'Untitled variation'}</div>
                  {v.deadline && (
                    <div className="text-xs text-red-500 mt-0.5">⏰ Deadline: {v.deadline}</div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                  <select
                    value={v.status}
                    onChange={e => handleStatusChange(v.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none min-h-[36px]"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    className="text-xs text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-2.5 py-2 min-h-[44px] flex items-center"
                  >
                    {expanded === v.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="text-xs text-red-400 border border-red-200 rounded-lg px-2.5 py-2 min-h-[44px] flex items-center"
                  >Del</button>
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
                            setCalc({ labourHours: '', labourRate: '', materials: '', overhead: '15' })
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
                      <button
                        onClick={() => navigator.clipboard.writeText(v.notice_drafted ?? '')}
                        className="mt-2 text-xs text-amber-700 border border-amber-300 rounded-lg px-3 py-2 min-h-[44px] flex items-center"
                      >
                        📋 Copy to clipboard
                      </button>
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

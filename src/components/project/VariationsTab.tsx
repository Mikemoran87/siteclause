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

export default function VariationsTab({ projectId, userId }: Props) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
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
    <div className="space-y-5">
      {/* Summary bar */}
      {variations.length > 0 && (
        <div className="bg-[#1B4332] text-white rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-green-200">{variations.length} variation{variations.length !== 1 ? 's' : ''} tracked</span>
          {totalValue > 0 && (
            <span className="font-black text-amber-400 text-lg">
              £{totalValue.toLocaleString()} estimated
            </span>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Add Variation
        </button>
      </div>

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
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {v.status}
                    </span>
                    {v.value && <span className="text-amber-600 font-bold text-sm">{v.value}</span>}
                  </div>
                  <div className="font-semibold text-gray-900 text-sm truncate">{v.title || 'Untitled variation'}</div>
                  {v.deadline && (
                    <div className="text-xs text-red-500 mt-0.5">⏰ Deadline: {v.deadline}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={v.status}
                    onChange={e => handleStatusChange(v.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    className="text-xs text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-2.5 py-1"
                  >
                    {expanded === v.id ? 'Hide' : 'Details'}
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="text-xs text-red-400 border border-red-200 rounded-lg px-2.5 py-1"
                  >Del</button>
                </div>
              </div>
              {expanded === v.id && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                  {v.description && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</div>
                      <p className="text-sm text-gray-700">{v.description}</p>
                    </div>
                  )}
                  {v.notice_drafted && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Draft Notice</div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 font-serif text-sm text-gray-700 whitespace-pre-wrap">
                        {v.notice_drafted}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(v.notice_drafted ?? '')}
                        className="mt-2 text-xs text-amber-700 border border-amber-300 rounded-lg px-3 py-1"
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

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">Add Variation</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Eastern boundary drainage relocation"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="What happened, when, and what was instructed"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Estimated Value</label>
                  <input
                    type="text"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="e.g. £8,500"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Notice Deadline</label>
                  <input
                    type="text"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    placeholder="e.g. 14 days from instruction (5 Jan 2026)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
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

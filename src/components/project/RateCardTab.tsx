import { useState, useEffect } from 'react'
import { getRateCard, saveRateCard, getContracts } from '../../lib/db'
import type { Rate } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
}

const CATEGORIES = ['Labour', 'Plant', 'Materials', 'Subcontract', 'Overhead & Profit', 'Other']
const UNITS = ['hr', 'day', 'week', 'm', 'm²', 'm³', 'no', 't', 'sum', '%']

export default function RateCardTab({ projectId, userId }: Props) {
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newRow, setNewRow] = useState<Rate>({ category: 'Other', description: '', unit: 'day', rate: 0 })
  const [extracting, setExtracting] = useState(false)

  useEffect(() => { load() }, [projectId])

  const load = async () => {
    setLoading(true)
    const saved = await getRateCard(projectId)
    setRates(saved)
    setLoading(false)
  }

  const handleSave = async (ratesToSave: Rate[]) => {
    setSaving(true)
    setError('')
    try {
      await saveRateCard(projectId, userId, ratesToSave)
      const verified = await getRateCard(projectId)
      if (verified.length === 0 && ratesToSave.length > 0) {
        throw new Error('Saved but 0 rates returned — run the SQL migration at supabase.com/dashboard/project/fefglfnvhklfyfyhtvsr/sql/new:\nalter table rate_cards add constraint rate_cards_project_id_key unique (project_id);')
      }
      setRates(verified)
      setSuccess(`Saved ✓ — ${verified.length} rate${verified.length !== 1 ? 's' : ''}`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  const updateRate = (index: number, field: keyof Rate, value: string | number) => {
    setRates(prev => prev.map((r, i) => i === index ? { ...r, [field]: field === 'rate' ? (parseFloat(String(value)) || 0) : value } : r))
  }

  const removeRate = (index: number) => {
    setRates(prev => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    if (!newRow.description.trim()) return
    const updated = [...rates, { ...newRow }]
    setRates(updated)
    setNewRow({ category: 'Other', description: '', unit: 'day', rate: 0 })
    // Auto-save immediately when row added
    handleSave(updated)
  }

  const handleExtractFromContract = async () => {
    setExtracting(true)
    setError('')
    try {
      const allDocs = await getContracts(projectId)
      if (allDocs.length === 0) throw new Error('No contract uploaded yet')
      const contractText = allDocs.map(c => `=== ${c.doc_type}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`).join('\n\n')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Extract all rates, prices and unit costs from this contract. Return ONLY a JSON array:\n[{"category":"Labour","description":"General Labourer","unit":"hr","rate":38},...]\nCategories: Labour, Plant, Materials, Subcontract, Overhead & Profit, Other\nUnits: hr, day, week, m, m², m³, no, t, sum, %\n\n${contractText.slice(0, 80000)}`
          }],
          contractText: contractText.slice(0, 80000),
        }),
      })
      const data = await response.json() as { reply?: string; error?: string }
      if (!response.ok || data.error) throw new Error(data.error || 'Extraction failed')
      const jsonMatch = data.reply?.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No rates found in contract')
      const extracted = JSON.parse(jsonMatch[0]) as Rate[]
      const merged = [...rates]
      for (const r of extracted) {
        if (!merged.find(x => x.description === r.description)) merged.push(r)
      }
      await handleSave(merged)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
    }
    setExtracting(false)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl whitespace-pre-wrap">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{success}</div>
      )}

      {/* Extract from contract */}
      <button
        onClick={handleExtractFromContract}
        disabled={extracting}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm transition-colors min-h-[44px] flex items-center justify-center gap-2"
      >
        {extracting ? (
          <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Reading contract…</>
        ) : '✨ Extract Rates from Contract'}
      </button>

      {/* Rates table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-base">Rate Card</h2>
            <p className="text-xs text-gray-400 mt-0.5">Used by AI to value all claims</p>
          </div>
          {rates.length > 0 && (
            <button
              onClick={() => handleSave(rates)}
              disabled={saving}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm min-h-[40px]"
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          )}
        </div>

        {rates.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            No rates yet — add one below
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rates.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-2 flex-wrap">
                <select
                  value={r.category}
                  onChange={e => updateRate(i, 'category', e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none w-28 flex-shrink-0"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input
                  value={r.description}
                  onChange={e => updateRate(i, 'description', e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none flex-1 min-w-[120px]"
                />
                <select
                  value={r.unit}
                  onChange={e => updateRate(i, 'unit', e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none w-16 flex-shrink-0"
                >
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm text-gray-400">€</span>
                  <input
                    type="number"
                    min="0"
                    value={r.rate || ''}
                    onChange={e => updateRate(i, 'rate', e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none w-24"
                  />
                </div>
                <button onClick={() => removeRate(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none ml-1">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Add new row */}
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Add Rate</div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newRow.category}
              onChange={e => setNewRow(r => ({ ...r, category: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none w-28 bg-white flex-shrink-0"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              value={newRow.description}
              onChange={e => setNewRow(r => ({ ...r, description: e.target.value }))}
              placeholder="e.g. Contractor Day Rate"
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none flex-1 min-w-[140px] bg-white"
            />
            <select
              value={newRow.unit}
              onChange={e => setNewRow(r => ({ ...r, unit: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none w-16 bg-white flex-shrink-0"
            >
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-sm text-gray-400">€</span>
              <input
                type="number"
                min="0"
                value={newRow.rate || ''}
                onChange={e => setNewRow(r => ({ ...r, rate: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none w-24 bg-white"
              />
            </div>
            <button
              onClick={addRow}
              disabled={!newRow.description.trim() || saving}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm min-h-[40px] flex-shrink-0"
            >
              {saving ? 'Saving…' : '+ Add & Save'}
            </button>
          </div>
        </div>
      </div>

      {rates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>AI analysis ready.</strong> These rates will be used to value all variation and delay claims.
        </div>
      )}
    </div>
  )
}

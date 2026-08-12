import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getRateCard, saveRateCard, getContracts } from '../../lib/db'
import type { Rate } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
}

const DEFAULT_RATES: Rate[] = [
  { category: 'Other', description: 'Contractor Day Rate (Part 2D — all claims)', unit: 'day', rate: 0 },
]

const UNITS = ['hr', 'day', 'week', 'm', 'm²', 'm³', 'no', 't', 'sum', '%']
const CATEGORIES = ['Labour', 'Plant', 'Materials', 'Subcontract', 'Overhead & Profit', 'Other']

function parseSpreadsheetToRates(file: File): Promise<Rate[] | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const wb = XLSX.read(buffer, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        if (!rows.length) { resolve(null); return }

        // Find columns
        const headers = Object.keys(rows[0]).map(h => h.toLowerCase())
        const descCol = Object.keys(rows[0]).find((_, i) =>
          /desc|item|trade|activity|work/.test(headers[i])
        )
        const unitCol = Object.keys(rows[0]).find((_, i) => /unit/.test(headers[i]))
        const rateCol = Object.keys(rows[0]).find((_, i) =>
          /rate|price|cost|amount/.test(headers[i])
        )
        const catCol = Object.keys(rows[0]).find((_, i) =>
          /cat|section|type|group/.test(headers[i])
        )

        if (!descCol && !rateCol) { resolve(null); return }

        const rates: Rate[] = []
        for (const row of rows) {
          const desc = String(row[descCol ?? ''] ?? '').trim()
          const rateRaw = parseFloat(String(row[rateCol ?? ''] ?? '').replace(/[^0-9.]/g, ''))
          if (!desc || isNaN(rateRaw) || rateRaw === 0) continue
          rates.push({
            category: catCol ? String(row[catCol] ?? 'Other').trim() : 'Other',
            description: desc,
            unit: unitCol ? String(row[unitCol] ?? 'hr').trim() : 'hr',
            rate: rateRaw,
          })
        }
        resolve(rates.length ? rates : null)
      } catch {
        resolve(null)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

export default function RateCardTab({ projectId, userId }: Props) {
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [preview, setPreview] = useState<Rate[] | null>(null)
  const [newRow, setNewRow] = useState<Rate>({ category: 'Labour', description: '', unit: 'hr', rate: 0 })
  const [showAdd, setShowAdd] = useState(false)
  const [extracting, setExtracting] = useState(false)

  useEffect(() => {
    load()
  }, [projectId])

  const handleExtractFromContract = async () => {
    setExtracting(true)
    setError('')
    setSuccess('')
    try {
      const allDocs = await getContracts(projectId)
      if (allDocs.length === 0) throw new Error('No contract uploaded yet — upload a contract first')
      const contract = { content: allDocs.map(c => `=== ${c.doc_type}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`).join('\n\n') }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Extract all rates, prices and unit costs from this contract. Return ONLY a JSON array with this exact format, no other text:
[{"category":"Labour","description":"General Labourer","unit":"hr","rate":38},...]

Categories must be one of: Labour, Plant, Materials, Subcontract, Overhead & Profit, Other
Units must be one of: hr, m, m², m³, no, t, sum, %

Contract text:
${contract.content.slice(0, 8000)}`
          }],
          contractText: contract.content
        }),
      })

      const data = await response.json() as { reply?: string; error?: string }
      if (!response.ok || data.error) throw new Error(data.error || 'Extraction failed')

      // Parse the JSON from the AI response
      const reply = data.reply ?? ''
      const jsonMatch = reply.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No rates found in contract — the contract may not contain a Bill of Quantities')

      const extracted = JSON.parse(jsonMatch[0]) as Rate[]
      if (!Array.isArray(extracted) || extracted.length === 0) throw new Error('No rates found in contract')

      // Merge with existing rates (extracted rates take priority)
      const merged = [...extracted]
      for (const def of DEFAULT_RATES) {
        if (!merged.find(r => r.description.toLowerCase() === def.description.toLowerCase())) {
          merged.push(def)
        }
      }

      setRates(merged)
      await saveRateCard(projectId, userId, merged)
      setSuccess(`✅ Extracted ${extracted.length} rate${extracted.length !== 1 ? 's' : ''} from contract and saved`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Extraction failed'
      setError(msg)
    }
    setExtracting(false)
  }

  const load = async () => {
    setLoading(true)
    const saved = await getRateCard(projectId)
    setRates(saved.length ? saved : [])
    setLoading(false)
  }

  const handleSave = async (ratesToSave: Rate[]) => {
    setSaving(true)
    setError('')
    try {
      await saveRateCard(projectId, userId, ratesToSave)
      setRates(ratesToSave)
      setSuccess('Rate card saved ✓')
      setEditMode(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  const loadDefaults = () => {
    setRates([...DEFAULT_RATES])
    setEditMode(true)
    setSuccess('')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const parsed = await parseSpreadsheetToRates(file)
    if (parsed && parsed.length > 0) {
      setPreview(parsed)
    } else {
      setError('Could not parse rate columns from this file. Make sure it has Description, Unit, and Rate columns.')
    }
    e.target.value = ''
  }

  const confirmPreview = () => {
    if (preview) {
      setRates(preview)
      setPreview(null)
      setEditMode(true)
    }
  }

  const removeRate = (index: number) => {
    setRates(prev => prev.filter((_, i) => i !== index))
  }

  const updateRate = (index: number, field: keyof Rate, value: string | number) => {
    setRates(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    if (!newRow.description.trim()) return
    setRates(prev => [...prev, { ...newRow }])
    setNewRow({ category: 'Labour', description: '', unit: 'hr', rate: 0 })
    setShowAdd(false)
  }

  const groupedRates = rates.reduce<Record<string, Rate[]>>((acc, r) => {
    ;(acc[r.category] = acc[r.category] || []).push(r)
    return acc
  }, {})

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4 md:space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>
      )}

      {/* Extract from contract button */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <button
          onClick={handleExtractFromContract}
          disabled={extracting}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm transition-colors min-h-[44px] flex items-center justify-center gap-2"
        >
          {extracting ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Reading contract for rates…
            </>
          ) : (
            '✨ Extract Rates from Contract'
          )}
        </button>
        <p className="text-xs text-amber-700 mt-2 text-center">
          AI reads your contract and pulls out all BOQ rates automatically
        </p>
      </div>

      {/* Header actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-base">Rate Card</h2>
          <p className="text-xs text-gray-400 mt-0.5">Project-specific rates used in AI variation analysis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!editMode && rates.length === 0 && (
            <button
              onClick={loadDefaults}
              className="text-sm font-semibold text-[#1B4332] border border-[#1B4332] rounded-xl px-4 py-2.5 hover:bg-green-50 min-h-[44px]"
            >
              Load defaults
            </button>
          )}
          {!editMode && rates.length > 0 && (
            <button
              onClick={() => setEditMode(true)}
              className="text-sm font-semibold text-gray-600 border border-gray-300 rounded-xl px-4 py-2.5 hover:bg-gray-50 min-h-[44px]"
            >
              Edit
            </button>
          )}
          <label className="text-sm font-semibold bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl px-4 py-2.5 cursor-pointer min-h-[44px] flex items-center">
            📤 Upload spreadsheet
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Upload preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0" onClick={() => setPreview(null)} />
          <div className="relative w-full md:max-w-2xl bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">Preview — {preview.length} rates parsed</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-2xl min-h-[44px] flex items-center">×</button>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left py-2 pr-3">Category</th>
                    <th className="text-left py-2 pr-3">Description</th>
                    <th className="text-left py-2 pr-3">Unit</th>
                    <th className="text-right py-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 30).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-3 text-gray-500">{r.category}</td>
                      <td className="py-2 pr-3 text-gray-800">{r.description}</td>
                      <td className="py-2 pr-3 text-gray-500">{r.unit}</td>
                      <td className="py-2 text-right font-semibold text-gray-900">€{r.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 30 && (
                <p className="text-xs text-gray-400 mt-2">…and {preview.length - 30} more</p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setPreview(null)} className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 min-h-[44px]">Cancel</button>
              <button onClick={confirmPreview} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-5 py-3 rounded-xl text-sm min-h-[44px]">
                Use these rates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rates.length === 0 && !editMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="font-bold text-gray-700 mb-2">No rate card yet</h3>
          <p className="text-sm text-gray-400 mb-6">Upload a spreadsheet or load the default Irish construction rates to get started.</p>
          <button onClick={loadDefaults} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-5 py-3 rounded-xl text-sm min-h-[44px]">
            Load default rates
          </button>
        </div>
      )}

      {/* Rate table — view mode */}
      {rates.length > 0 && !editMode && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{rates.length} rates saved</span>
          </div>
          {Object.entries(groupedRates).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-black text-gray-600 uppercase tracking-wide">{cat}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5 text-gray-800">{r.description}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{r.unit}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                        {r.unit === '%' ? `${r.rate}%` : `€${r.rate}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Edit mode */}
      {editMode && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
            <span className="text-xs font-bold text-amber-700">✏️ Editing — make changes then save</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-left px-3 py-2">Unit</th>
                  <th className="text-left px-3 py-2">Rate</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-2 py-1.5">
                      <select
                        value={r.category}
                        onChange={e => updateRate(i, 'category', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-full"
                      >
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.description}
                        onChange={e => updateRate(i, 'description', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-full min-w-[140px]"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.unit}
                        onChange={e => updateRate(i, 'unit', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      >
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={r.rate}
                        onChange={e => updateRate(i, 'rate', parseFloat(e.target.value) || 0)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-20"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => removeRate(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold min-h-[36px] px-2"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          {showAdd ? (
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={newRow.category}
                    onChange={e => setNewRow(r => ({ ...r, category: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-full"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={newRow.description}
                    onChange={e => setNewRow(r => ({ ...r, description: e.target.value }))}
                    placeholder="e.g. Bricklayer"
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Unit</label>
                  <select
                    value={newRow.unit}
                    onChange={e => setNewRow(r => ({ ...r, unit: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-full"
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rate (€)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRow.rate || ''}
                    onChange={e => setNewRow(r => ({ ...r, rate: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332] w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addRow} disabled={!newRow.description.trim()}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm min-h-[44px]">
                  Add row
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2 min-h-[44px]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 px-4 py-3">
              <button onClick={() => setShowAdd(true)}
                className="text-sm text-[#1B4332] font-semibold border border-[#1B4332] rounded-xl px-4 py-2.5 hover:bg-green-50 min-h-[44px]">
                + Add row
              </button>
            </div>
          )}

          {/* Save/cancel */}
          <div className="border-t border-gray-100 px-4 py-4 flex flex-col md:flex-row gap-3 md:justify-end bg-white">
            <button
              onClick={() => { setEditMode(false); load() }}
              className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(rates)}
              disabled={saving}
              className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm min-h-[44px]"
            >
              {saving ? 'Saving…' : '💾 Save rate card'}
            </button>
          </div>
        </div>
      )}

      {/* Info note */}
      {rates.length > 0 && !editMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>AI analysis ready.</strong> When you run analysis on this project, the AI will reference these rates to value variations accurately.
        </div>
      )}
    </div>
  )
}

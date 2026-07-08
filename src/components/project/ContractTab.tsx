import { useState, useEffect } from 'react'
import { saveContract, getContract } from '../../lib/db'
import type { Contract } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
}

export default function ContractTab({ projectId, userId }: Props) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadContract()
  }, [projectId])

  const loadContract = async () => {
    setLoading(true)
    const c = await getContract(projectId)
    setContract(c)
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSaving(true)
    try {
      const text = await file.text()
      await saveContract(projectId, userId, file.name, text)
      await loadContract()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    }
    setSaving(false)
    e.target.value = ''
  }

  const handlePasteSave = async () => {
    if (!pasteText.trim()) return
    setError('')
    setSaving(true)
    try {
      await saveContract(projectId, userId, 'Pasted contract text', pasteText.trim())
      setPasteText('')
      setShowPaste(false)
      await loadContract()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
    }
    setSaving(false)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4 md:space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {!contract ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="font-bold text-gray-700 mb-2">No contract uploaded yet</h3>
          <p className="text-sm text-gray-400 mb-6">Upload your subcontract to enable AI analysis and chat.</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <label className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-5 py-3 rounded-xl text-sm cursor-pointer transition-colors min-h-[44px] flex items-center justify-center">
              {saving ? 'Uploading…' : 'Upload Contract File'}
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={saving}
              />
            </label>
            <button
              onClick={() => setShowPaste(true)}
              className="border-2 border-[#1B4332] text-[#1B4332] font-bold px-5 py-3 rounded-xl text-sm hover:bg-green-50 transition-colors min-h-[44px]"
            >
              Paste Contract Text
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-gray-900 text-sm truncate">{contract.filename}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Uploaded {new Date(contract.uploaded_at).toLocaleDateString()} ·{' '}
                {contract.content ? `${Math.ceil(contract.content.length / 1000)}k chars` : ''}
              </div>
            </div>
            <label className="text-sm font-semibold text-[#1B4332] border border-[#1B4332] rounded-lg px-3 py-2 hover:bg-green-50 transition-colors cursor-pointer min-h-[44px] flex items-center flex-shrink-0">
              Replace
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={saving}
              />
            </label>
          </div>
          <div className="p-4 md:p-5">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-100">
              {contract.content?.slice(0, 5000)}
              {(contract.content?.length ?? 0) > 5000 && (
                <span className="text-gray-400 italic">{'\n\n'}… (contract continues — full text stored)</span>
              )}
            </pre>
          </div>
        </div>
      )}

      {/* Paste modal — bottom sheet on mobile */}
      {showPaste && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowPaste(false)} />
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">Paste Contract Text</h3>
              <button onClick={() => setShowPaste(false)} className="text-gray-400 hover:text-gray-600 text-2xl min-h-[44px] flex items-center">×</button>
            </div>
            <div className="p-5 md:p-6 pb-8">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={8}
                placeholder="Paste your subcontract text here…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono"
              />
              <div className="mt-3 flex flex-col md:flex-row gap-3 md:justify-end">
                <button
                  onClick={() => setShowPaste(false)}
                  className="w-full md:w-auto text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 min-h-[44px]"
                >Cancel</button>
                <button
                  onClick={handlePasteSave}
                  disabled={saving || !pasteText.trim()}
                  className="w-full md:w-auto bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm min-h-[44px]"
                >
                  {saving ? 'Saving…' : 'Save Contract'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

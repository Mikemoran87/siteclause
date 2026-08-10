import { useState, useEffect } from 'react'
import { saveContract, getContracts, deleteContractById } from '../../lib/db'
import type { Contract } from '../../lib/db'
import { parseFileToText } from '../../lib/parseFile'

interface Props {
  projectId: string
  userId: string
}

const DOC_TYPES = [
  'Main Contract',
  'Specification',
  'Bill of Quantities',
  'Drawings',
  'Programme',
  'Change Order',
  'Other',
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isWordDoc(fileType?: string, filename?: string): boolean {
  if (fileType) return fileType.includes('word') || fileType.includes('officedocument.wordprocessing')
  const ext = filename?.split('.').pop()?.toLowerCase() ?? ''
  return ['doc', 'docx'].includes(ext)
}

function isSpreadsheet(fileType?: string, filename?: string): boolean {
  if (fileType) return fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv'
  const ext = filename?.split('.').pop()?.toLowerCase() ?? ''
  return ['xlsx', 'xls', 'csv'].includes(ext)
}

function DocTypeTag({ type }: { type?: string }) {
  const colors: Record<string, string> = {
    'Main Contract': 'bg-green-100 text-green-800',
    'Specification': 'bg-blue-100 text-blue-800',
    'Bill of Quantities': 'bg-amber-100 text-amber-800',
    'Programme': 'bg-purple-100 text-purple-800',
    'Change Order': 'bg-red-100 text-red-800',
    'Drawings': 'bg-gray-100 text-gray-700',
    'Other': 'bg-gray-100 text-gray-700',
  }
  const t = type ?? 'Other'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[t] ?? 'bg-gray-100 text-gray-700'}`}>
      {t}
    </span>
  )
}

export default function ContractTab({ projectId, userId }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<'file' | 'paste'>('file')
  const [pasteText, setPasteText] = useState('')
  const [docType, setDocType] = useState('Main Contract')
  const [docLabel, setDocLabel] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    loadContracts()
  }, [projectId])

  const loadContracts = async () => {
    setLoading(true)
    const docs = await getContracts(projectId)
    setContracts(docs)
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSaving(true)
    try {
      const [base64, text] = await Promise.all([fileToBase64(file), parseFileToText(file)])
      await saveContract(projectId, userId, file.name, text, base64, file.type, docLabel || file.name, docType)
      await loadContracts()
      setShowAdd(false)
      setDocLabel('')
      setDocType('Main Contract')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
    setSaving(false)
    e.target.value = ''
  }

  const handlePasteSave = async () => {
    if (!pasteText.trim()) return
    setError('')
    setSaving(true)
    try {
      const label = docLabel || docType
      await saveContract(projectId, userId, label, pasteText.trim(), undefined, undefined, label, docType)
      setPasteText('')
      setDocLabel('')
      setDocType('Main Contract')
      setShowAdd(false)
      await loadContracts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await deleteContractById(id)
    setContracts(prev => prev.filter(c => c.id !== id))
    setConfirmDelete(null)
    if (expanded === id) setExpanded(null)
  }

  const handleDownload = (c: Contract) => {
    if (!c.file_data) return
    const a = document.createElement('a')
    a.href = c.file_data
    a.download = c.filename ?? 'document'
    a.click()
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4 md:space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-base">Contract Documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {contracts.length === 0
              ? 'Upload your subcontract, spec, BOQ or programme'
              : `${contracts.length} document${contracts.length !== 1 ? 's' : ''} — AI reads all of them`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors min-h-[44px]"
        >
          + Add Document
        </button>
      </div>

      {/* Empty state */}
      {contracts.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="font-bold text-gray-700 mb-1">No documents yet</h3>
          <p className="text-sm text-gray-400">Upload your subcontract to get started. Add the spec, BOQ and programme too — the AI reads everything.</p>
        </div>
      )}

      {/* Document list */}
      {contracts.map(c => {
        const isPdf = c.file_type === 'application/pdf'
        const isWord = isWordDoc(c.file_type, c.filename)
        const isSheet = isSpreadsheet(c.file_type, c.filename)
        const hasOriginal = !!c.file_data
        const isOpen = expanded === c.id

        return (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Row header */}
            <div className="px-4 md:px-5 py-3.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DocTypeTag type={c.doc_type} />
                  <span className="font-semibold text-gray-900 text-sm truncate">
                    {c.label ?? c.filename ?? 'Document'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {c.filename && c.filename !== c.label && <span>{c.filename} · </span>}
                  {new Date(c.uploaded_at).toLocaleDateString('en-IE')}
                  {c.content && ` · ${Math.ceil(c.content.length / 1000)}k chars`}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasOriginal && !isPdf && (
                  <button
                    onClick={() => handleDownload(c)}
                    className="text-xs text-[#1B4332] border border-[#1B4332] rounded-lg px-2.5 py-2 hover:bg-green-50 min-h-[40px]"
                  >
                    {isSheet ? '📊' : '📄'} Download
                  </button>
                )}
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="text-xs text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-2.5 py-2 min-h-[40px]"
                >
                  {isOpen ? 'Hide' : 'View'}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className={`text-xs font-semibold rounded-lg px-2.5 py-2 min-h-[40px] transition-colors ${
                    confirmDelete === c.id
                      ? 'bg-red-600 text-white'
                      : 'text-red-500 border border-red-200 hover:bg-red-50'
                  }`}
                >
                  {confirmDelete === c.id ? '⚠️ Confirm' : '🗑'}
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-gray-100">
                {isPdf && hasOriginal ? (
                  <div style={{ height: '70vh' }}>
                    <iframe src={c.file_data} className="w-full h-full" title={c.filename} />
                  </div>
                ) : (
                  <div className="p-4">
                    {(isWord || isSheet) && hasOriginal && (
                      <p className="text-xs text-gray-400 mb-2 italic">
                        Original {isSheet ? 'spreadsheet' : 'Word document'} stored — extracted text shown below.
                      </p>
                    )}
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-100" style={{ maxHeight: '60vh' }}>
                      {c.content ?? '(no text content)'}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add Document Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowAdd(false)} />
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">Add Contract Document</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl min-h-[44px] flex items-center">×</button>
            </div>
            <div className="p-5 space-y-4 pb-8">

              {/* Doc type */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Document Type</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                >
                  {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Label */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Label (optional)</label>
                <input
                  type="text"
                  value={docLabel}
                  onChange={e => setDocLabel(e.target.value)}
                  placeholder={`e.g. CIF Subcontract Rev B`}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>

              {/* Mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAddMode('file')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${addMode === 'file' ? 'bg-[#1B4332] text-white' : 'border border-gray-200 text-gray-600'}`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setAddMode('paste')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${addMode === 'paste' ? 'bg-[#1B4332] text-white' : 'border border-gray-200 text-gray-600'}`}
                >
                  Paste Text
                </button>
              </div>

              {addMode === 'file' ? (
                <label className="w-full flex items-center justify-center bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-5 py-4 rounded-xl text-sm cursor-pointer transition-colors min-h-[56px]">
                  {saving ? 'Uploading…' : '↑ Choose File (PDF, Word, Excel, TXT)'}
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={saving}
                  />
                </label>
              ) : (
                <>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    rows={8}
                    placeholder="Paste your contract text, BOQ, specification or programme here…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAdd(false)}
                      className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-xl py-3 min-h-[44px]"
                    >Cancel</button>
                    <button
                      onClick={handlePasteSave}
                      disabled={saving || !pasteText.trim()}
                      className="flex-1 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm min-h-[44px]"
                    >
                      {saving ? 'Saving…' : 'Save Document'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

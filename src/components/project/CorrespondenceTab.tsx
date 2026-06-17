import { useState, useEffect, useRef } from 'react'
import { saveCorrespondence, getCorrespondence, deleteCorrespondence } from '../../lib/db'
import type { Correspondence } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
  emailPrefix: string
}

export default function CorrespondenceTab({ projectId, userId, emailPrefix }: Props) {
  const [items, setItems] = useState<Correspondence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
  }, [projectId])

  const load = async () => {
    setLoading(true)
    const data = await getCorrespondence(projectId)
    setItems(data)
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSaving(true)
    try {
      const text = await file.text()
      await saveCorrespondence(projectId, userId, text, file.name)
      await load()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
    }
    setSaving(false)
    e.target.value = ''
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setOcrLoading(true)

    try {
      // Convert image to base64 in the browser
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
          const b64 = result.split(',')[1]
          if (b64) resolve(b64)
          else reject(new Error('Failed to read image'))
        }
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/ocr-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      })

      const data = await response.json() as { text?: string; error?: string }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'OCR failed')
      }

      // Pre-fill the paste modal with extracted text
      setPasteText(data.text || '')
      setSource(`Screenshot: ${file.name}`)
      setShowAdd(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OCR failed'
      setError(`Couldn't read the image (${message}) — try pasting the text instead`)
    }

    setOcrLoading(false)
    e.target.value = ''
  }

  const handlePasteSave = async () => {
    if (!pasteText.trim()) return
    setError('')
    setSaving(true)
    try {
      await saveCorrespondence(projectId, userId, pasteText.trim(), source || 'Pasted text')
      setPasteText('')
      setSource('')
      setShowAdd(false)
      await load()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this correspondence item?')) return
    await deleteCorrespondence(id)
    await load()
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  const projectEmail = `${emailPrefix}@in.siteclause.io`

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(projectEmail).catch(() => {})
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Email forwarding info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
          📧 Your Project Email Address
        </div>
        <div className="font-mono text-sm text-gray-800 mb-2">{projectEmail}</div>
        <p className="text-xs text-gray-500">
          CC or forward any site emails to this address — they'll appear here automatically.
        </p>
        <button
          onClick={handleCopyEmail}
          className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
        >
          Copy address →
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => { setShowAdd(true); setError('') }}
          className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          + Paste Correspondence
        </button>

        <label className="border-2 border-[#1B4332] text-[#1B4332] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors cursor-pointer">
          {saving ? 'Uploading…' : '↑ Upload File'}
          <input
            type="file"
            accept=".txt,.pdf,.msg,.eml"
            onChange={handleFileUpload}
            className="hidden"
            disabled={saving}
          />
        </label>

        <label className={`border-2 border-[#1B4332] text-[#1B4332] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors cursor-pointer ${ocrLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {ocrLoading ? 'Reading image with AI…' : '📷 Upload Screenshot'}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,.heic,.heif"
            onChange={handleImageUpload}
            className="hidden"
            disabled={ocrLoading}
          />
        </label>
      </div>

      {/* OCR loading indicator */}
      {ocrLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Reading image with AI — this takes a few seconds…
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📧</div>
          <h3 className="font-bold text-gray-700 mb-1">No correspondence yet</h3>
          <p className="text-sm text-gray-400">Upload or paste site emails, WhatsApp exports, and letters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-400 text-sm">📄</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{item.source}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.uploaded_at).toLocaleDateString()} ·{' '}
                      {Math.ceil((item.content?.length ?? 0) / 1000)}k chars
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="text-xs text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-2.5 py-1 hover:bg-green-50"
                  >
                    {expanded === item.id ? 'Hide' : 'View'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2.5 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expanded === item.id && (
                <div className="border-t border-gray-100 p-5">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-72 overflow-y-auto bg-gray-50 rounded-lg p-3">
                    {item.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paste / OCR review modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Add Correspondence</h3>
              <button onClick={() => { setShowAdd(false); setPasteText(''); setSource('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Source / Label</label>
                <input
                  type="text"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  placeholder="e.g. WhatsApp export, Email from Gary Pearce"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Content</label>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={8}
                  placeholder="Paste emails, WhatsApp messages, site diary entries…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] font-mono"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowAdd(false); setPasteText(''); setSource('') }}
                  className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5"
                >Cancel</button>
                <button
                  onClick={handlePasteSave}
                  disabled={saving || !pasteText.trim()}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

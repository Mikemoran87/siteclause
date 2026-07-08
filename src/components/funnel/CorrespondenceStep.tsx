import { useRef, useState } from 'react'

interface Props {
  onContinue: (files: File[], text: string) => void
  onBack: () => void
}

export default function CorrespondenceStep({ onContinue, onBack }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [pasteText, setPasteText] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  const addFile = (file: File) => {
    setFiles(prev => [...prev, file])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files).forEach(addFile)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrError('')
    setOcrLoading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
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
      if (!response.ok || data.error) throw new Error(data.error || 'OCR failed')
      setPasteText(prev => prev ? prev + '\n\n---\n\n' + (data.text || '') : (data.text || ''))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OCR failed'
      setOcrError(`Couldn't read image (${message}) — try pasting text instead`)
    }
    setOcrLoading(false)
    e.target.value = ''
  }

  const hasContent = files.length > 0 || pasteText.trim().length > 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8 max-w-xl mx-auto">
      <div className="w-full">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
          ← Back
        </button>

        <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-3">
          Add your site correspondence
        </h2>
        <p className="text-gray-500 text-base mb-2 leading-relaxed">
          Upload emails, WhatsApp exports, or screenshots. SiteClause will compare them against your contract to find specific variation claims.
        </p>
        <p className="text-xs text-gray-400 mb-8">
          Optional — you can skip this and we'll still analyse your contract for general entitlements.
        </p>

        {/* Upload buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* File upload */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex-1 min-w-[140px] border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${dragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.eml,.msg"
              className="hidden"
              onChange={(e) => Array.from(e.target.files || []).forEach(addFile)}
            />
            <div className="text-2xl mb-1">📁</div>
            <div className="text-xs font-semibold text-gray-600">Upload files</div>
            <div className="text-xs text-gray-400">.txt, .pdf, .eml</div>
          </label>

          {/* Screenshot */}
          <label className={`flex-1 min-w-[140px] border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${ocrLoading ? 'opacity-60' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/heic,.heic"
              className="hidden"
              onChange={handleImageUpload}
              disabled={ocrLoading}
            />
            <div className="text-2xl mb-1">{ocrLoading ? '⏳' : '📷'}</div>
            <div className="text-xs font-semibold text-gray-600">{ocrLoading ? 'Reading…' : 'Screenshot'}</div>
            <div className="text-xs text-gray-400">WhatsApp photo</div>
          </label>

          {/* WhatsApp export */}
          <label className="flex-1 min-w-[140px] border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors border-green-200 hover:border-green-300 bg-white">
            <input
              type="file"
              accept=".txt,.zip"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])}
            />
            <div className="text-2xl mb-1">💬</div>
            <div className="text-xs font-semibold text-gray-600">WhatsApp export</div>
            <div className="text-xs text-gray-400">Export chat as .txt</div>
          </label>
        </div>

        {ocrError && (
          <p className="text-xs text-red-500 mb-3">{ocrError}</p>
        )}

        {/* Files added */}
        {files.length > 0 && (
          <div className="mb-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <span className="text-sm text-gray-700 truncate">📄 {f.name}</span>
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  className="text-xs text-red-400 hover:text-red-600 ml-2 flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Paste area */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Or paste emails / messages directly
          </label>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={5}
            placeholder="Paste WhatsApp messages, emails, site instructions here…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono text-sm"
          />
        </div>

        {/* WhatsApp export instructions */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">💬 How to export WhatsApp</div>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Open the specific conversation in the WhatsApp mobile app</li>
            <li>Tap the <strong>contact or group name</strong> at the top</li>
            <li>Scroll down, select <strong>Export Chat</strong></li>
            <li>Choose <strong>Without Media</strong></li>
            <li>Save to <strong>Files</strong></li>
            <li>Upload the .txt file above</li>
          </ol>
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onContinue(files, pasteText)}
            disabled={!hasContent}
            className="w-full bg-[#111] hover:bg-[#333] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-full text-base transition-colors min-h-[56px]"
          >
            Analyse with correspondence →
          </button>
          <button
            onClick={() => onContinue([], '')}
            className="w-full border border-gray-200 text-gray-500 hover:text-gray-700 font-semibold py-4 rounded-full text-sm transition-colors min-h-[56px]"
          >
            Skip — just analyse the contract
          </button>
        </div>
      </div>
    </div>
  )
}

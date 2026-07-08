import { useState, useEffect } from 'react'
import { getVariations } from '../../lib/db'
import type { Variation } from '../../lib/db'

interface Props {
  projectId: string
}

export default function NoticesTab({ projectId }: Props) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [projectId])

  const load = async () => {
    setLoading(true)
    const data = await getVariations(projectId)
    setVariations(data.filter(v => v.notice_drafted))
    setLoading(false)
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDownload = (title: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_notice.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
        <strong>Formal notices</strong> from your variation claims — ready to copy or download and send.
      </div>

      {variations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📬</div>
          <h3 className="font-bold text-gray-700 mb-1">No notices yet</h3>
          <p className="text-sm text-gray-400">
            Draft notices appear here when variations have notice text. Add a variation with a draft notice to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {variations.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-sm">{v.title || 'Untitled variation'}</div>
                    {v.value && <div className="text-xs text-amber-600 font-semibold mt-0.5">{v.value}</div>}
                    {v.deadline && (
                      <div className="text-xs text-red-500 mt-0.5">⏰ Deadline: {v.deadline}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopy(v.id, v.notice_drafted ?? '')}
                    className="flex-1 sm:flex-none text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg px-3 py-2.5 hover:bg-amber-100 transition-colors min-h-[44px] flex items-center justify-center gap-1"
                  >
                    {copied === v.id ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  <button
                    onClick={() => handleDownload(v.title ?? 'notice', v.notice_drafted ?? '')}
                    className="flex-1 sm:flex-none text-xs font-semibold text-[#1B4332] border border-[#1B4332] rounded-lg px-3 py-2.5 hover:bg-green-50 transition-colors min-h-[44px] flex items-center justify-center gap-1"
                  >
                    ↓ Download
                  </button>
                </div>
              </div>
              <div className="p-4 md:p-5">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">
                  AI-Drafted Variation Notice
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 font-serif text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {v.notice_drafted}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

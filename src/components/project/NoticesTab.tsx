import { useState, useEffect } from 'react'
import { getVariations } from '../../lib/db'
import type { Variation } from '../../lib/db'

interface Props {
  projectId: string
  projectName?: string
}

export default function NoticesTab({ projectId, projectName }: Props) {
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

  const handleEmail = (v: Variation, type: 'vo' | 'delay') => {
    const prefix = type === 'delay' ? 'Compensation Event Notice' : 'Variation Notice'
    const subject = encodeURIComponent(`${prefix} — ${v.title}${projectName ? ` — ${projectName}` : ''}`)
    const body = encodeURIComponent(v.notice_drafted ?? '')
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
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

  const contractNotices = variations.filter(v => !v.source || v.source === 'contract' || v.source === 'manual')
  const programmeNotices = variations.filter(v => v.source === 'programme')

  const NoticeCard = ({ v, type }: { v: Variation; type: 'vo' | 'delay' }) => (
    <div key={v.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${type === 'delay' ? 'border-blue-100' : 'border-gray-200'}`}>
      <div className={`px-3 py-1.5 border-b text-xs font-bold uppercase tracking-wide ${type === 'delay' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
        {type === 'delay' ? '📊 Compensation Event / Delay Notice' : '📄 Variation Order Notice'}
      </div>
      <div className="px-4 md:px-5 py-4 border-b border-gray-100">
        <div className="mb-3">
          <div className="font-bold text-gray-900 text-sm">{v.title || 'Untitled'}</div>
          {v.value && <div className={`text-xs font-semibold mt-0.5 ${type === 'delay' ? 'text-blue-600' : 'text-amber-600'}`}>{v.value}</div>}
          {v.deadline && <div className="text-xs text-red-500 mt-0.5">⏰ {v.deadline}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy(v.id, v.notice_drafted ?? '')}
            className={`flex-1 sm:flex-none text-xs font-semibold border rounded-lg px-3 py-2.5 transition-colors min-h-[44px] flex items-center justify-center gap-1 ${type === 'delay' ? 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100' : 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100'}`}
          >
            {copied === v.id ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={() => handleEmail(v, type)}
            className={`flex-1 sm:flex-none text-xs font-bold text-white rounded-lg px-3 py-2.5 transition-colors min-h-[44px] flex items-center justify-center gap-1 ${type === 'delay' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#1B4332] hover:bg-[#2D6A4F]'}`}
          >
            ✉️ Send Email
          </button>
          <button
            onClick={() => handleDownload(v.title ?? 'notice', v.notice_drafted ?? '')}
            className="flex-1 sm:flex-none text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center gap-1"
          >
            ↓ Download
          </button>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <div className={`rounded-lg p-4 font-serif text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border ${type === 'delay' ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
          {v.notice_drafted}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Section 1: VO Notices */}
      {contractNotices.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-black text-gray-900 text-sm">📄 Variation Order Notices</h3>
            <p className="text-xs text-gray-400 mt-0.5">From contract & correspondence analysis — {contractNotices.length} notice{contractNotices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-4">
            {contractNotices.map(v => <NoticeCard key={v.id} v={v} type="vo" />)}
          </div>
        </div>
      )}

      {/* Section 2: Delay / Compensation Event Notices */}
      {programmeNotices.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-black text-gray-900 text-sm">📊 Compensation Event / Delay Notices</h3>
            <p className="text-xs text-gray-400 mt-0.5">From programme analysis — {programmeNotices.length} notice{programmeNotices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-4">
            {programmeNotices.map(v => <NoticeCard key={v.id} v={v} type="delay" />)}
          </div>
        </div>
      )}

      {variations.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📬</div>
          <h3 className="font-bold text-gray-700 mb-1">No notices yet</h3>
          <p className="text-sm text-gray-400">Run the analysis in the Variations tab to generate formal notices automatically.</p>
        </div>
      )}
    </div>
  )
}

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

  useEffect(() => { load() }, [projectId])

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

  const handleEmail = (v: Variation) => {
    const subject = encodeURIComponent(`Variation Notice — ${v.title}${projectName ? ` — ${projectName}` : ''}`)
    const body = encodeURIComponent(v.notice_drafted ?? '')
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  const contractNotices = variations.filter(v => !v.source || v.source === 'contract' || v.source === 'manual')
  const programmeNotices = variations.filter(v => v.source === 'programme')

  const NoticeCard = ({ v, accentColor }: { v: Variation; accentColor: 'amber' | 'blue' }) => {
    const bg = accentColor === 'amber' ? 'bg-amber-50' : 'bg-blue-50'
    const border = accentColor === 'amber' ? 'border-amber-200' : 'border-blue-200'
    const text = accentColor === 'amber' ? 'text-amber-800' : 'text-blue-800'
    const btnBorder = accentColor === 'amber' ? 'border-amber-300 text-amber-700 hover:bg-amber-100' : 'border-blue-300 text-blue-700 hover:bg-blue-100'
    const label = accentColor === 'amber' ? 'Variation Order Notice' : 'Compensation Event / Delay Notice'

    return (
      <div key={v.id} className={`bg-white rounded-xl border ${border} shadow-sm overflow-hidden`}>
        <div className={`px-3 py-1.5 ${bg} border-b ${border}`}>
          <span className={`text-xs font-bold ${text}`}>{accentColor === 'amber' ? '📄' : '📊'} {label}</span>
        </div>
        <div className="px-4 md:px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="font-bold text-gray-900 text-sm">{v.title || 'Untitled'}</div>
              {v.value && <div className={`text-xs font-semibold mt-0.5 ${accentColor === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>{v.value}</div>}
              {v.deadline && <div className="text-xs text-red-500 mt-0.5">⏰ {v.deadline}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCopy(v.id, v.notice_drafted ?? '')}
              className={`flex-1 sm:flex-none text-xs font-semibold border rounded-lg px-3 py-2.5 transition-colors min-h-[44px] flex items-center justify-center gap-1 ${btnBorder}`}
            >
              {copied === v.id ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={() => handleDownload(v.title ?? 'notice', v.notice_drafted ?? '')}
              className="flex-1 sm:flex-none text-xs font-semibold text-[#1B4332] border border-[#1B4332] rounded-lg px-3 py-2.5 hover:bg-green-50 transition-colors min-h-[44px] flex items-center justify-center gap-1"
            >
              ↓ Download
            </button>
            <button
              onClick={() => handleEmail(v)}
              className="flex-1 sm:flex-none text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg px-3 py-2.5 transition-colors min-h-[44px] flex items-center justify-center gap-1"
            >
              ✉️ Send Email
            </button>
          </div>
        </div>
        <div className="p-4 md:p-5">
          <div className={`text-xs font-bold ${text} uppercase tracking-widest mb-3`}>
            Draft Notice — Ready to Send
          </div>
          <div className={`${bg} border ${border} rounded-lg p-4 font-serif text-sm text-gray-700 leading-relaxed whitespace-pre-wrap`}>
            {v.notice_drafted}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-7">

      {/* Section 1: Variation Order Notices */}
      {contractNotices.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-black text-gray-900 text-sm">📄 Variation Order Notices</h3>
            <p className="text-xs text-gray-400 mt-0.5">From your subcontract, emails and WhatsApp correspondence — {contractNotices.length} notice{contractNotices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-4">
            {contractNotices.map(v => <NoticeCard key={v.id} v={v} accentColor="amber" />)}
          </div>
        </div>
      )}

      {/* Section 2: Programme / Compensation Event Notices */}
      {programmeNotices.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-black text-gray-900 text-sm">📊 Compensation Event & Delay Notices</h3>
            <p className="text-xs text-gray-400 mt-0.5">From your programme analysis — {programmeNotices.length} notice{programmeNotices.length !== 1 ? 's' : ''} — PW-CF3 Compensation Events</p>
          </div>
          <div className="space-y-4">
            {programmeNotices.map(v => <NoticeCard key={v.id} v={v} accentColor="blue" />)}
          </div>
        </div>
      )}

      {variations.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📬</div>
          <h3 className="font-bold text-gray-700 mb-1">No notices yet</h3>
          <p className="text-sm text-gray-400">Run the variation analysis or programme scan from the Variations tab to generate notices.</p>
        </div>
      )}
    </div>
  )
}

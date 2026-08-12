import { useState, useEffect } from 'react'
import { getVariations, updateVariation } from '../../lib/db'
import type { Variation } from '../../lib/db'

interface Props {
  projectId: string
  projectName?: string
}

interface TimelineEvent {
  date: string
  dateObj: Date
  type: 'claim_identified' | 'notice_1_due' | 'notice_1_sent' | 'notice_2_due' | 'notice_2_sent' | 'monthly_due' | 'status_change'
  variationId: string
  variationTitle: string
  variationValue?: string
  source?: string
  sent?: boolean
  status?: string
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toNextMonth(dateStr: string): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export default function TimelineTab({ projectId, projectName }: Props) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all')

  useEffect(() => { load() }, [projectId])

  const load = async () => {
    setLoading(true)
    const data = await getVariations(projectId)
    setVariations(data)
    setLoading(false)
  }

  const handleMarkSent = async (v: Variation, type: 'notice_1' | 'notice_2' | 'monthly') => {
    if (type === 'notice_1') {
      await updateVariation(v.id, { notice_1_sent: true })
      setVariations(prev => prev.map(x => x.id === v.id ? { ...x, notice_1_sent: true } : x))
    } else if (type === 'notice_2') {
      await updateVariation(v.id, { notice_2_sent: true })
      setVariations(prev => prev.map(x => x.id === v.id ? { ...x, notice_2_sent: true } : x))
    } else if (type === 'monthly') {
      const next = toNextMonth(v.next_monthly_due!)
      await updateVariation(v.id, { next_monthly_due: next })
      setVariations(prev => prev.map(x => x.id === v.id ? { ...x, next_monthly_due: next } : x))
    }
  }

  const handleEmail = (v: Variation, noticeType: string) => {
    const subject = encodeURIComponent(`${noticeType} — ${v.title}${projectName ? ` — ${projectName}` : ''}`)
    const body = encodeURIComponent(v.notice_drafted ?? '')
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  // Build timeline events from all variations
  const events: TimelineEvent[] = []
  for (const v of variations) {
    if (v.claim_date) {
      events.push({
        date: v.claim_date,
        dateObj: new Date(v.claim_date),
        type: 'claim_identified',
        variationId: v.id,
        variationTitle: v.title ?? 'Untitled',
        variationValue: v.value,
        source: v.source,
      })
    }
    if (v.notice_1_due) {
      events.push({
        date: v.notice_1_due,
        dateObj: new Date(v.notice_1_due),
        type: v.notice_1_sent ? 'notice_1_sent' : 'notice_1_due',
        variationId: v.id,
        variationTitle: v.title ?? 'Untitled',
        variationValue: v.value,
        source: v.source,
        sent: v.notice_1_sent,
      })
    }
    if (v.notice_2_due) {
      events.push({
        date: v.notice_2_due,
        dateObj: new Date(v.notice_2_due),
        type: v.notice_2_sent ? 'notice_2_sent' : 'notice_2_due',
        variationId: v.id,
        variationTitle: v.title ?? 'Untitled',
        variationValue: v.value,
        source: v.source,
        sent: v.notice_2_sent,
      })
    }
    if (v.next_monthly_due) {
      events.push({
        date: v.next_monthly_due,
        dateObj: new Date(v.next_monthly_due),
        type: 'monthly_due',
        variationId: v.id,
        variationTitle: v.title ?? 'Untitled',
        variationValue: v.value,
        source: v.source,
      })
    }
  }

  // Sort: past first, future last
  events.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

  // Filter
  const today = new Date(); today.setHours(0,0,0,0)
  const filtered = events.filter(e => {
    if (filter === 'pending') return e.dateObj >= today && !e.sent && e.type !== 'claim_identified'
    if (filter === 'overdue') return e.dateObj < today && !e.sent && e.type !== 'claim_identified' && e.type !== 'notice_1_sent' && e.type !== 'notice_2_sent'
    return true
  })

  // Summary counts
  const overdueCount = events.filter(e => e.dateObj < today && !e.sent && e.type !== 'claim_identified' && !e.type.includes('sent')).length
  const pendingCount = events.filter(e => e.dateObj >= today && !e.sent && e.type !== 'claim_identified').length
  const sentCount = events.filter(e => e.type === 'notice_1_sent' || e.type === 'notice_2_sent').length

  if (loading) return <div className="py-10 text-center text-gray-400">Loading…</div>

  const getVariationById = (id: string) => variations.find(v => v.id === id)

  const EventCard = ({ e }: { e: TimelineEvent }) => {
    const v = getVariationById(e.variationId)
    if (!v) return null

    const days = daysUntil(e.date)
    const isPast = days < 0
    const isToday = days === 0
    const isSoon = days > 0 && days <= 5

    const typeConfig = {
      claim_identified: { icon: '📋', label: 'Claim identified', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
      notice_1_due: { icon: '📅', label: 'Notice 1 due', color: isPast ? 'bg-red-50 text-red-700 border-red-200' : isSoon ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-700 border-gray-200', dot: isPast ? 'bg-red-500' : isSoon ? 'bg-amber-400' : 'bg-blue-400' },
      notice_1_sent: { icon: '✅', label: 'Notice 1 sent', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
      notice_2_due: { icon: '📅', label: 'Notice 2 (substantiation) due', color: isPast ? 'bg-red-50 text-red-700 border-red-200' : isSoon ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-700 border-gray-200', dot: isPast ? 'bg-red-500' : isSoon ? 'bg-amber-400' : 'bg-blue-400' },
      notice_2_sent: { icon: '✅', label: 'Notice 2 sent', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
      monthly_due: { icon: '🔄', label: 'Monthly update due', color: isPast ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-gray-700 border-gray-200', dot: isPast ? 'bg-orange-500' : 'bg-purple-400' },
      status_change: { icon: '📝', label: 'Status changed', color: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
    }
    const cfg = typeConfig[e.type]
    const sourceTag = e.source === 'programme' ? '📊' : '📄'

    return (
      <div className={`flex gap-3 items-start`}>
        {/* Timeline dot */}
        <div className="flex flex-col items-center flex-shrink-0 mt-1">
          <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-2 ring-white`} />
          <div className="w-0.5 bg-gray-200 flex-1 mt-1 min-h-[24px]" />
        </div>

        {/* Card */}
        <div className={`flex-1 border rounded-xl p-3 mb-2 ${cfg.color}`}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm">{cfg.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide">{cfg.label}</span>
                <span className="text-xs">{sourceTag}</span>
                {isPast && !e.sent && e.type !== 'claim_identified' && (
                  <span className="text-xs font-black bg-red-600 text-white px-1.5 py-0.5 rounded-full">OVERDUE</span>
                )}
                {isToday && !e.sent && e.type !== 'claim_identified' && (
                  <span className="text-xs font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>
                )}
                {isSoon && !e.sent && e.type !== 'claim_identified' && (
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{days}d</span>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{e.variationTitle}</div>
              {e.variationValue && <div className="text-xs font-bold text-gray-500 mt-0.5">{e.variationValue}</div>}
              <div className="text-xs text-gray-400 mt-0.5">{formatDate(e.date)}</div>
            </div>

            {/* Actions */}
            {!e.sent && e.type !== 'claim_identified' && (
              <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                {e.type === 'notice_1_due' && (
                  <>
                    <button onClick={() => handleMarkSent(v, 'notice_1')} className="text-xs font-bold bg-green-600 text-white rounded-lg px-2.5 py-1.5 min-h-[36px]">✓ Mark Sent</button>
                    {v.notice_drafted && <button onClick={() => handleEmail(v, 'First Variation Notice')} className="text-xs font-bold bg-[#1B4332] text-white rounded-lg px-2.5 py-1.5 min-h-[36px]">✉️ Send</button>}
                  </>
                )}
                {e.type === 'notice_2_due' && (
                  <>
                    <button onClick={() => handleMarkSent(v, 'notice_2')} className="text-xs font-bold bg-green-600 text-white rounded-lg px-2.5 py-1.5 min-h-[36px]">✓ Mark Sent</button>
                    {v.notice_drafted && <button onClick={() => handleEmail(v, 'Second Variation Notice — Substantiation')} className="text-xs font-bold bg-[#1B4332] text-white rounded-lg px-2.5 py-1.5 min-h-[36px]">✉️ Send</button>}
                  </>
                )}
                {e.type === 'monthly_due' && (
                  <>
                    <button onClick={() => handleMarkSent(v, 'monthly')} className="text-xs font-bold bg-purple-600 text-white rounded-lg px-2.5 py-1.5 min-h-[36px]">✓ Sent — Roll to Next Month</button>
                    {v.notice_drafted && <button onClick={() => handleEmail(v, 'Monthly Update Notice')} className="text-xs font-bold bg-[#1B4332] text-white rounded-lg px-2.5 py-1.5 min-h-[36px]">✉️ Send</button>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5">

      {/* Summary bar */}
      {events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-red-600">{overdueCount}</div>
            <div className="text-xs text-red-700 font-semibold mt-0.5">Overdue</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
            <div className="text-xs text-amber-700 font-semibold mt-0.5">Pending</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-600">{sentCount}</div>
            <div className="text-xs text-green-700 font-semibold mt-0.5">Sent</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {events.length > 0 && (
        <div className="flex gap-2">
          {(['all', 'pending', 'overdue'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors capitalize ${filter === f ? 'bg-[#1B4332] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'All Events' : f === 'pending' ? 'Upcoming' : 'Overdue'}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="font-bold text-gray-700 mb-1">No timeline yet</h3>
          <p className="text-sm text-gray-400">Run the variation analysis or programme scan to generate claims with deadlines. They'll appear here as a chronological timeline.</p>
        </div>
      )}

      {/* Timeline */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Claim Timeline — {filtered.length} event{filtered.length !== 1 ? 's' : ''}</div>
          <div>
            {filtered.map((e, i) => (
              <EventCard key={`${e.variationId}-${e.type}-${i}`} e={e} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && events.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-400">No {filter} events.</p>
        </div>
      )}
    </div>
  )
}

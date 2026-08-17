import type { Variation } from '../../lib/db'

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Sent: 'bg-blue-100 text-blue-700',
  Agreed: 'bg-green-100 text-green-700',
  Disputed: 'bg-red-100 text-red-700',
}
const STATUSES = ['Draft', 'Sent', 'Agreed', 'Disputed']

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function DeadlineBadge({ label, due, sent, onMarkSent }: {
  label: string; due: string; sent?: boolean; onMarkSent: () => void
}) {
  if (sent) return <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">✅ {label} sent</span>
  const days = daysUntil(due)
  const fmt = new Date(due).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
  return (
    <button onClick={e => { e.stopPropagation(); onMarkSent() }}
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
        days < 0 ? 'bg-red-600 text-white border-red-600' :
        days <= 3 ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' :
        'bg-gray-100 text-gray-600 border-gray-200'
      }`}>
      {days < 0 ? `⚠️ ${label} OVERDUE` : `📅 ${label} due ${fmt}${days <= 7 ? ` (${days}d)` : ''}`}
    </button>
  )
}

function ClaimTypeBadge({ claimType }: { claimType?: string }) {
  if (!claimType) return null
  if (claimType === 'Variation Order') return <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">📄 VO</span>
  if (claimType === 'Compensation Event') return <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⏱ CE</span>
  if (claimType === 'Additional Works') return <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">➕ Additional</span>
  return null
}

interface Props {
  v: Variation
  expanded: boolean
  editingId: string | null
  editTitle: string
  editValue: string
  onToggleExpand: () => void
  onStatusChange: (status: string) => void
  onDelete: () => void
  onStartAdjust: () => void
  onSaveAdjust: () => void
  onCancelAdjust: () => void
  onEditTitleChange: (t: string) => void
  onEditValueChange: (v: string) => void
  onMarkSent: (type: 'notice_1' | 'notice_2') => void
  onRollMonthly: () => void
  onCopyNotice: () => void
  onEmailNotice: () => void
}

export default function VariationCard({
  v, expanded, editingId, editTitle, editValue,
  onToggleExpand, onStatusChange, onDelete, onStartAdjust,
  onSaveAdjust, onCancelAdjust, onEditTitleChange, onEditValueChange,
  onMarkSent, onRollMonthly, onCopyNotice, onEmailNotice,
}: Props) {
  const isEditing = editingId === v.id
  const valueColour = v.value?.startsWith('⚠️') ? 'text-orange-500' : 'text-amber-600'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Claim type header (for programme claims) */}
      {v.claim_type && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <ClaimTypeBadge claimType={v.claim_type} />
        </div>
      )}

      {/* Main row */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {v.status}
            </span>
            {isEditing ? (
              <input type="number" value={editValue} onChange={e => onEditValueChange(e.target.value)}
                placeholder="Value €" onClick={e => e.stopPropagation()}
                className="text-amber-600 font-bold text-sm border border-amber-300 rounded px-2 py-0.5 w-28 focus:outline-none" />
            ) : (
              v.value && <span className={`font-bold text-sm ${valueColour}`}>{v.value}</span>
            )}
          </div>
          {isEditing ? (
            <input type="text" value={editTitle} onChange={e => onEditTitleChange(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="font-semibold text-gray-900 text-sm border border-gray-300 rounded px-2 py-1 w-full focus:outline-none" />
          ) : (
            <div className="font-semibold text-gray-900 text-sm">{v.title || 'Untitled'}</div>
          )}
          {v.deadline && <div className="text-xs text-red-500 mt-0.5">⏰ {v.deadline}</div>}
          {v.notice_1_due && (
            <div className="flex flex-wrap gap-1 mt-1">
              <DeadlineBadge label="Notice 1" due={v.notice_1_due} sent={v.notice_1_sent} onMarkSent={() => onMarkSent('notice_1')} />
              {v.notice_2_due && <DeadlineBadge label="Notice 2" due={v.notice_2_due} sent={v.notice_2_sent} onMarkSent={() => onMarkSent('notice_2')} />}
              {v.next_monthly_due && <DeadlineBadge label="Monthly" due={v.next_monthly_due} sent={false} onMarkSent={onRollMonthly} />}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 flex-shrink-0">
          {!isEditing && (
            <select value={v.status} onChange={e => onStatusChange(e.target.value)} onClick={e => e.stopPropagation()}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none min-h-[36px]">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          {isEditing ? (
            <>
              <button onClick={onSaveAdjust} className="text-xs text-white bg-[#1B4332] rounded-lg px-2.5 py-2 min-h-[44px] font-semibold">Save</button>
              <button onClick={onCancelAdjust} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-2 min-h-[44px]">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={onToggleExpand} className="text-xs text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-2.5 py-2 min-h-[44px]">{expanded ? 'Hide' : 'Details'}</button>
              <button onClick={onStartAdjust} className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-2 min-h-[44px]">Edit</button>
              <button onClick={onDelete} className="text-xs text-red-400 border border-red-200 rounded-lg px-2.5 py-2 min-h-[44px]">Del</button>
            </>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3">
          {v.description && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.description}</p>
            </div>
          )}
          {v.notice_drafted && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Draft Notice</div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono">{v.notice_drafted}</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <button onClick={onCopyNotice} className="text-xs text-amber-700 border border-amber-300 rounded-lg px-3 py-2 min-h-[44px]">📋 Copy</button>
                <button onClick={onEmailNotice} className="text-xs text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg px-3 py-2 min-h-[44px]">✉️ Send Email</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

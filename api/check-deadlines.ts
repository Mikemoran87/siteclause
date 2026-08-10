import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
)

function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added++ // skip weekends
  }
  return result
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Can be called by cron or manually
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const today = formatDate(new Date())

    // Get all variations with deadline tracking enabled
    const { data: variations, error } = await supabase
      .from('variations')
      .select('*, projects(name, user_id)')
      .not('claim_date', 'is', null)

    if (error) throw error
    if (!variations?.length) return res.status(200).json({ checked: 0, alerts: [] })

    const alerts: Array<{ variationId: string; title: string; type: string; dueDate: string; daysUntil: number }> = []

    for (const v of variations) {
      // Notice 1 — due within 20 working days
      if (v.notice_1_due && !v.notice_1_sent) {
        const days = daysUntil(v.notice_1_due)
        if (days <= 5 && days >= 0) {
          alerts.push({
            variationId: v.id,
            title: v.title,
            type: 'notice_1',
            dueDate: v.notice_1_due,
            daysUntil: days,
          })
        }
        if (days < 0) {
          // Overdue — still alert
          alerts.push({
            variationId: v.id,
            title: v.title,
            type: 'notice_1_overdue',
            dueDate: v.notice_1_due,
            daysUntil: days,
          })
        }
      }

      // Notice 2 — due 20 working days after notice 1
      if (v.notice_2_due && !v.notice_2_sent) {
        const days = daysUntil(v.notice_2_due)
        if (days <= 5 && days >= 0) {
          alerts.push({
            variationId: v.id,
            title: v.title,
            type: 'notice_2',
            dueDate: v.notice_2_due,
            daysUntil: days,
          })
        }
      }

      // Monthly update
      if (v.next_monthly_due) {
        const days = daysUntil(v.next_monthly_due)
        if (days <= 3 && days >= 0) {
          alerts.push({
            variationId: v.id,
            title: v.title,
            type: 'monthly_update',
            dueDate: v.next_monthly_due,
            daysUntil: days,
          })

          // Roll to next month
          const next = new Date(v.next_monthly_due)
          next.setMonth(next.getMonth() + 1)
          await supabase.from('variations').update({ next_monthly_due: formatDate(next) }).eq('id', v.id)
        }
      }
    }

    return res.status(200).json({
      checked: variations.length,
      alerts,
      today,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed'
    return res.status(500).json({ error: msg })
  }
}

export { addWorkingDays, formatDate }

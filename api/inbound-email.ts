import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Use service key if available, otherwise fall back to anon key.
// The Supabase RLS policies must allow public project reads and unauthenticated
// correspondence inserts for this to work with the anon key.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always return HTTP 200 — Mailgun retries on non-200 which would cause duplicates.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      recipient,
      sender,
      subject,
      'stripped-text': strippedText,
      'body-plain': bodyPlain,
    } = req.body

    if (!recipient) {
      return res.status(200).json({ ok: false, error: 'No recipient in payload' })
    }

    // Extract email prefix: sc-abc12345@in.siteclause.io → sc-abc12345
    const emailPrefix = recipient.split('@')[0]

    if (!emailPrefix) {
      return res.status(200).json({ ok: false, error: 'Could not parse email prefix' })
    }

    // Look up the project — requires "Public can read project by email" RLS policy
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('email_prefix', emailPrefix)
      .single()

    if (projectError || !project) {
      console.error('Project not found for email prefix:', emailPrefix, projectError?.message)
      // Return 200 so Mailgun does not retry unknown addresses
      return res.status(200).json({ ok: false, error: 'Project not found' })
    }

    // Build a readable content block from the email fields
    const bodyText = strippedText || bodyPlain || '(no content)'
    const content = [
      `FROM: ${sender || 'unknown'}`,
      `SUBJECT: ${subject || '(no subject)'}`,
      `DATE: ${new Date().toISOString()}`,
      '---',
      bodyText,
    ].join('\n')

    // Insert into correspondence — requires "Server can insert correspondence" RLS policy
    const { error: insertError } = await supabase
      .from('correspondence')
      .insert({
        project_id: project.id,
        user_id: project.user_id,
        content,
        source: `email:${sender || 'unknown'}`,
      })

    if (insertError) {
      console.error('Correspondence insert error:', insertError.message)
      return res.status(200).json({ ok: false, error: insertError.message })
    }

    console.log(`Saved inbound email for project ${project.id} (prefix: ${emailPrefix})`)
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('Inbound email handler error:', err)
    // Still 200 — prevent Mailgun from retrying and creating duplicates
    return res.status(200).json({ ok: false, error: 'Internal error' })
  }
}

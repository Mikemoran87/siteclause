import type { VercelRequest, VercelResponse } from '@vercel/node'

interface DelayClaim {
  title: string
  description: string
  estimatedValue: string
  deadlineStatus: string
  draftNotice: string
  responsibleParty: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { programmeText, contractText = '', rateContext = '' } = req.body as {
      programmeText: string
      contractText?: string
      rateContext?: string
    }

    if (!programmeText) return res.status(400).json({ error: 'No programme text provided' })

    const systemPrompt = `You are a construction claims expert specialising in delay analysis for Irish subcontractors. You are AGGRESSIVE in identifying claims — your job is to find EVERY possible entitlement, not just the obvious ones.

You will be given a 4-week lookahead programme (exported from MS Project or Primavera P6). Each row is a task with ID, Name, Duration, Start, Finish.

Find EVERY claim. Do not group them — each blocked task or delay event is a SEPARATE claim. Be exhaustive.

Look for ALL of these:
1. Tasks with "awaiting", "cannot commence", "pending", "waiting on", "blocked", "delayed due to" in the name
2. ANY utility diversion awaited — ESB, Eir, Gas Networks, Irish Water, BT, Virgin. Each utility conflict = separate claim
3. ANY landowner access not granted — each plot = separate claim
4. ANY local authority (CCC, DCC, SDCC etc.) permission or instruction outstanding — each one = separate claim
5. ANY verbal instruction mentioned that hasn't been formally issued as a Change Order or Variation Order
6. ANY RFI response outstanding
7. Tasks with 0-day duration that are milestones showing something is NOT done yet
8. Tasks explicitly noted as "Delayed due to Change Order X" — that Change Order may be unvalued
9. Works extended by verbal instruction not yet confirmed in writing
10. Design changes, revised drawings, or pavement design changes affecting programme
11. Third-party dependencies (Tree felling by others, specialist subcontractors with lead times) causing delays
12. Any task where the note says "GCEL gave X weeks notice on [date]" — calculate how long outstanding

For EACH claim found:
- title: Specific descriptive name (e.g. "ESB.08 Overhead Diversion Delay — Ch440-540 Pouladuff Road")
- description: Full details — what is blocked, who is responsible, date notice was given, how long outstanding
- estimatedValue: If figures mentioned use them. Otherwise estimate based on crew size × days delayed × €800/day typical Irish civil crew day rate. Show working.
- deadlineStatus: "Submit notice immediately — entitlement may be time-barred" or "Notice required within 14 days"
- draftNotice: Formal 3-4 sentence notice from subcontractor to main contractor asserting entitlement, referencing the specific programme entry
- responsibleParty: ESB / Eir / Cork City Council / Client / Employer / Design Team / Landowner (be specific)

Return ONLY valid JSON: { "claims": [...] }
No preamble, no explanation, no markdown. Just the JSON.`

    const userContent = `PROGRAMME DOCUMENT:\n${programmeText.slice(0, 14000)}${contractText ? `\n\nCONTRACT CONTEXT:\n${contractText.slice(0, 2000)}` : ''}${rateContext}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }),
    })

    const data = await response.json() as {
      choices?: Array<{ message: { content: string } }>
      error?: { message: string }
    }

    if (!response.ok || data.error) throw new Error(data.error?.message ?? 'Analysis failed')

    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No claims found in programme')

    const result = JSON.parse(jsonMatch[0]) as { claims?: DelayClaim[] }
    return res.status(200).json({ claims: result.claims ?? [] })
  } catch (err: unknown) {
    console.error('Programme analysis error:', err)
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    return res.status(500).json({ error: msg })
  }
}

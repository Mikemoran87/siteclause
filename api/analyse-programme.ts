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
    const body = req.body as {
      programmes?: string[]      // array of programme texts (preferred)
      programmeText?: string     // single programme (backwards compat)
      contractText?: string
      rateContext?: string
    }

    // Accept either multiple programmes or a single one
    const programmes: string[] = body.programmes?.length
      ? body.programmes
      : body.programmeText
        ? [body.programmeText]
        : []

    if (programmes.length === 0) {
      return res.status(400).json({ error: 'No programme text provided' })
    }

    const contractText = body.contractText ?? ''
    const rateContext = body.rateContext ?? ''
    const isMulti = programmes.length > 1

    const systemPrompt = `You are a construction claims expert specialising in delay analysis for Irish subcontractors. Be AGGRESSIVE — find EVERY possible entitlement.

${isMulti ? `You have ${programmes.length} programme documents in chronological order. Compare them:
- Tasks blocked in MULTIPLE programmes = stronger claim (note how many weeks it has persisted)
- Tasks that got WORSE = escalating claim
- NEW blocks in later programme = new claim
Treat each blocked task as a SEPARATE claim even if it appears across multiple programmes.

` : ''}Each programme row has: ID, Name, Duration, Start, Finish, Resources.

Find ALL of these:
1. Tasks with "awaiting", "cannot commence", "pending", "waiting on", "blocked", "delayed due to" in the name
2. Utility diversions awaited — ESB, Eir, Gas Networks, Irish Water. Each conflict = separate claim
3. Landowner access not granted — each plot = separate claim  
4. Local authority (CCC, DCC etc.) permission/instruction outstanding — each = separate claim
5. Verbal instructions not confirmed as Change Orders/Variation Orders
6. RFI responses outstanding
7. Zero-duration milestone tasks showing something is NOT done
8. "Delayed due to Change Order X" — that CO may be unvalued
9. Works extended by verbal instruction not confirmed in writing
10. Design changes affecting programme
11. "GCEL gave X weeks notice on [date]" — calculate how long outstanding and state it

For EACH claim:
- title: Specific name e.g. "ESB.08 Overhead Diversion Delay — Ch440-540 Pouladuff Road"
- description: What is blocked, who is responsible, when notice was given, how long outstanding${isMulti ? ', which programmes it appears in' : ''}
- estimatedValue: Use figures stated in the programme/contract where available. For delay claims: if a day rate is provided in the rate card or contract Schedule, use that rate × number of days delayed (show working). If NO day rate is provided, write: "Day rate (from Part 2D of Schedule) × [X days] delayed". Do NOT invent a day rate.
- deadlineStatus: "Submit notice immediately" or "Notice required within X days" based on 28-day PW-CF3 rule
- draftNotice: Formal 3-4 sentence notice citing the programme entry and PW-CF3 clause
- responsibleParty: ESB / Eir / Cork City Council / Client / Employer / Landowner (be specific)

Return ONLY valid JSON: { "claims": [...] }
No markdown, no explanation. Just the JSON object.`

    // Build programme content — split token budget across programmes
    const maxTokens = 13000
    const perProg = Math.floor(maxTokens / programmes.length)
    const progContent = isMulti
      ? programmes.map((p, i) => `\n=== PROGRAMME ${i + 1} (${['earliest', 'later', 'latest', 'most recent'][Math.min(i, 3)]}) ===\n${p.slice(0, perProg)}`).join('\n')
      : programmes[0].slice(0, maxTokens)

    const userContent = [
      'PROGRAMME DOCUMENT(S):',
      progContent,
      contractText ? `\nCONTRACT CONTEXT (key clauses):\n${contractText.slice(0, 2000)}` : '',
      rateContext,
    ].filter(Boolean).join('\n')

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

    if (!response.ok || data.error) throw new Error(data.error?.message ?? 'OpenAI API error')

    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI returned no claims — try uploading a different programme file')

    const result = JSON.parse(jsonMatch[0]) as { claims?: DelayClaim[] }
    return res.status(200).json({ claims: result.claims ?? [] })

  } catch (err: unknown) {
    console.error('Programme analysis error:', err)
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    return res.status(500).json({ error: msg })
  }
}

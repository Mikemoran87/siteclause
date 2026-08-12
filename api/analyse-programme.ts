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

    const systemPrompt = `You are a construction claims expert specialising in delay analysis for Irish subcontractors under PW-CF3.

CRITICAL INSTRUCTION: Be EXHAUSTIVE. A typical Irish road improvement project with 2 lookahead charts will have 8-20 claimable events. If you find fewer than 6, you are almost certainly missing claims. Each blocked task, each utility conflict, each access issue, each Change Order, each verbal instruction = a SEPARATE claim. Do NOT group them.

${isMulti ? `You have ${programmes.length} programme documents in CHRONOLOGICAL ORDER (earliest first). These are sequential 4-week lookaheads from the same project — Programme 2 continues from Programme 1.

CRITICAL RULES FOR MULTI-PROGRAMME ANALYSIS:
- These programmes are CUMULATIVE — calculate total delay days from first appearance to last programme
- A task blocked in BOTH programmes = the delay has persisted — calculate total days from first blocked date to latest programme date
- Do NOT create duplicate claims for the same delay event — create ONE claim per delay event with the TOTAL duration
- Tasks NEW in Programme 2 that weren't in Programme 1 = new separate claims
- Tasks RESOLVED (in Prog 1 but not Prog 2) = no claim needed
- Change Orders and VOs in either programme = separate VO claims
- For delay duration: use the date first blocked (from earliest programme) to the date of the latest programme

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
- claimType: Classify as exactly one of: "Compensation Event" (employer-caused delay — utility, access, late instruction) | "Variation Order" (instructed additional/changed works, CO) | "Additional Works" (verbal instruction, out-of-scope works not yet formalised)
- title: Specific name e.g. "ESB.08 Overhead Diversion Delay — Ch440-540 Pouladuff Road"
- description: What is blocked/instructed, who is responsible, when notice was given, how long outstanding${isMulti ? ', which lookaheads it appears in' : ''}
- estimatedValue: Calculate from ACTUAL dates in the programme only. Use task Start date and Finish date (or today's date if still ongoing) to get calendar days, × 0.714 for working days, × day rate. Show working e.g. "Blocked from 30/03/26 to 11/05/26 = 42 calendar days = 30 working days × €5,000 = €150,000". If no day rate in rate card write "30 working days × [day rate required]". NEVER invent or estimate days — only use actual programme dates.
- deadlineStatus: "Submit notice immediately" or "Notice required within X days" based on 28-day PW-CF3 rule
- draftNotice: Formal 3-4 sentence notice citing the lookahead entry and PW-CF3 clause
- responsibleParty: ESB / Eir / Cork City Council / Client / Employer / Landowner (be specific)

Return ONLY valid JSON: { "claims": [...] }
No markdown, no explanation. Just the JSON object.`

    // Build programme content — split token budget across programmes
    // GPT-4o 128k context — use up to 200k chars for programmes + 50k for contract
    // 30k TPM limit on free tier — keep total programme text under ~60k chars
    const maxTokens = 60000
    const perProg = Math.floor(maxTokens / programmes.length)
    const progContent = isMulti
      ? programmes.map((p, i) => `\n=== PROGRAMME ${i + 1} (${['earliest', 'later', 'latest', 'most recent'][Math.min(i, 3)]}) ===\n${p.slice(0, perProg)}`).join('\n')
      : programmes[0].slice(0, maxTokens)

    const userContent = [
      'PROGRAMME DOCUMENT(S):',
      progContent,
      contractText ? `\nCONTRACT CONTEXT (key clauses):\n${contractText.slice(0, 15000)}` : '',
      rateContext,
    ].filter(Boolean).join('\n')

    // Retry up to 2 times on rate limit (429)
    let response: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          max_tokens: 8000,
        }),
      })
      if (response.status !== 429) break
      const retryAfter = parseInt(response.headers.get('retry-after') ?? '6', 10)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
    }
    if (!response) return res.status(500).json({ error: 'No response from OpenAI' })

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

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

    const systemPrompt = `You are a construction claims expert specialising in delay analysis for Irish subcontractors.
You will be given a 4-week lookahead programme (exported from MS Project or similar) and you must identify every delay event, blocked task, or variation entitlement.

Look specifically for:
- Tasks blocked by ESB, Eir, Gas Networks or other utilities (overhead diversions, wayleave issues)
- Tasks blocked by client/employer/local authority access issues or permissions
- Tasks delayed by design changes, late information, or RFI responses outstanding
- Verbal instructions not yet confirmed as Change Orders/Variation Orders
- Tasks showing "awaiting instruction", "cannot commence", "pending", "waiting on"
- Works extended by instruction not yet formally valued
- Acceleration instructions or out-of-sequence working
- Weather-dependent works that have been delayed

For EACH delay event found, extract:
- title: Short name of the claim (e.g. "ESB.08 Overhead Diversion Delay — Pouladuff Road")
- description: What the delay is, who is responsible, how long it has been outstanding
- estimatedValue: "To be assessed" unless figures are stated in programme
- deadlineStatus: "Submit notice immediately" or "Notice required within X days" based on typical contract terms
- draftNotice: A formal 2-3 sentence notice asserting the entitlement, referencing the programme entry
- responsibleParty: Who caused the delay (ESB/CCC/Client/Employer/Design Team etc.)

Return ONLY a JSON object: { "claims": [...] }
No other text.`

    const userContent = `PROGRAMME DOCUMENT:\n${programmeText.slice(0, 10000)}${contractText ? `\n\nCONTRACT CONTEXT:\n${contractText.slice(0, 2000)}` : ''}${rateContext}`

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
        max_tokens: 4000,
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

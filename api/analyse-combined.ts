import type { VercelRequest, VercelResponse } from '@vercel/node'

interface Claim {
  title: string
  claimType: string
  description: string
  estimatedValue: string
  deadlineStatus: string
  draftNotice: string
  responsibleParty: string
}

function extractKeyContractSections(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const keywords = [
    'variation', 'Variation', 'change order', 'Change Order',
    'compensation event', 'Compensation Event', 'delay', 'Delay',
    'notice', 'Notice', 'payment', 'Payment', 'day rate', 'Day Rate',
    'working day', 'Working Day', 'loss and expense', 'extension of time',
  ]
  const sections: Array<{ idx: number; text: string }> = []
  const seen = new Set<number>()
  for (const kw of keywords) {
    let from = 0
    while (from < text.length) {
      const idx = text.indexOf(kw, from)
      if (idx === -1) break
      const blockStart = Math.max(0, idx - 200)
      const key = Math.floor(blockStart / 400)
      if (!seen.has(key)) {
        seen.add(key)
        sections.push({ idx: blockStart, text: text.slice(blockStart, blockStart + 600) })
      }
      from = idx + kw.length
    }
  }
  sections.sort((a, b) => a.idx - b.idx)
  let result = ''
  for (const s of sections) {
    if (result.length + s.text.length > maxChars) break
    result += s.text + '\n---\n'
  }
  return result || text.slice(0, maxChars)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { contractText, correspondenceText, programmes, rateContext } = req.body as {
    contractText?: string
    correspondenceText?: string
    programmes?: string[]
    rateContext?: string
  }

  if (!contractText) return res.status(400).json({ error: 'contractText is required' })

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

  const contractExtracted = extractKeyContractSections(contractText, 60000)
  const corrContent = correspondenceText ? correspondenceText.slice(0, 20000) : ''
  const progContent = (programmes && programmes.length > 0)
    ? programmes.map((p, i) => `=== PROGRAMME ${i + 1} (${i === 0 ? 'earliest' : 'latest'}) ===\n${p}`).join('\n\n')
    : ''

  const hasProgrammes = progContent.length > 0

  const systemPrompt = `You are SiteClause, an expert Irish construction claims lawyer specialising in PW-CF3 contracts.

Your job: identify EVERY claimable event and value each one accurately.

${hasProgrammes ? `STEP 1 — SCAN THE PROGRAMMES LINE BY LINE. For EACH row containing any of these, create a SEPARATE claim:
- "awaiting" / "cannot commence" / "waiting on" / "blocked" / "delayed due to"
- ESB, EIR, Eir, Gas, Irish Water references
- Plot numbers with access issues (each plot = separate claim)
- Verbal instruction / VO / CO references
- Zero-duration milestone tasks (0 days) indicating a blockage
- Works extended beyond original scope

STEP 2 — CALCULATE VALUE from programme dates:
- For tasks blocked in Programme 1 AND Programme 2 (persistent): start = Programme 1 start date, end = Programme 2 date for that task
- For tasks only in Programme 2 (new): start = Programme 2 start date, end = today (${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })})
- Calendar days = end minus start (always positive — if dates seem reversed check you have start/end correct)
- Working days = calendar days x 0.714 (round to nearest whole number)
- Value = working days x day rate from rate card
- Show full working: "Blocked 30/03/26 to 11/05/26 = 42 cal days = 30 wd x EUR5000/day = EUR150000"
` : `Since no programme is uploaded, identify claims from contract and correspondence only. For value, use any dates mentioned in correspondence. If no dates available write "Requires programme dates — upload lookahead charts to value accurately".`}

STEP 3 — Also scan contract clauses and correspondence for:
- Any CO/VO instructed but not yet valued/agreed
- Any late instructions or information causing delay
- Any RFIs outstanding

CRITICAL: Return ALL claims — expect 10-20 on a project like this. Do NOT merge or summarise. Each event = one claim.

Return ONLY valid JSON: { "claims": [ { "title": "...", "claimType": "Compensation Event or Variation Order or Additional Works", "description": "...", "estimatedValue": "...", "deadlineStatus": "...", "draftNotice": "3-4 sentence formal notice", "responsibleParty": "..." } ] }`

  const userContent = [
    rateContext ? `RATE CARD:\n${rateContext}` : '',
    progContent ? `LOOKAHEAD PROGRAMMES:\n${progContent}` : '',
    corrContent ? `SITE CORRESPONDENCE:\n${corrContent}` : '',
    `CONTRACT (PW-CF3 v2.8 key clauses):\n${contractExtracted}`,
  ].filter(Boolean).join('\n\n')

  try {
    let response: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 8000,
        }),
      })
      if (response.status !== 429) break
      const retryAfter = parseInt(response.headers.get('retry-after') ?? '10', 10)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
    }
    if (!response) return res.status(500).json({ error: 'No response from OpenAI' })

    const data = await response.json() as {
      choices?: Array<{ message: { content: string } }>
      error?: { message: string }
    }

    if (!response.ok || data.error) {
      return res.status(500).json({ error: data.error?.message ?? 'OpenAI API error' })
    }

    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'No valid JSON in response' })

    const result = JSON.parse(jsonMatch[0]) as { claims?: Claim[] }
    const claims = (result.claims ?? []).map(c => ({
      ...c,
      // Normalise EUR -> € in estimatedValue for parser
      estimatedValue: c.estimatedValue.replace(/EUR(\d)/g, '€$1').replace(/EUR\s/g, '€'),
    }))

    return res.status(200).json({ claims })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}

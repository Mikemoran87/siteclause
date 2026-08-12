import type { VercelRequest, VercelResponse } from '@vercel/node'

// AI extracts FACTS ONLY — no calculations, no values
// All maths is done deterministically in the frontend
export interface ClaimEvent {
  title: string
  claimType: 'Compensation Event' | 'Variation Order' | 'Additional Works'
  description: string
  blockedFrom: string | null   // ISO date string YYYY-MM-DD or null if unknown
  blockedTo: string | null     // ISO date string YYYY-MM-DD or null if still ongoing
  stillOngoing: boolean        // true if task still blocked in latest programme
  missingData: string | null   // what data is needed to calculate value
  deadlineStatus: string
  draftNotice: string
  responsibleParty: string
  programmeRef: string         // e.g. "Task ID 9, Programme 1 & 2"
  clauseRef: string            // e.g. "PW-CF3 Cl. 10.3"
}

function extractKeyContractSections(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const keywords = [
    'variation', 'Variation', 'change order', 'Change Order',
    'compensation event', 'Compensation Event', 'delay', 'Delay',
    'notice', 'Notice', 'day rate', 'Day Rate', 'working day',
    'loss and expense', 'extension of time', 'access', 'utility',
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

  const { contractText, correspondenceText, programmes } = req.body as {
    contractText?: string
    correspondenceText?: string
    programmes?: string[]
  }

  if (!contractText) return res.status(400).json({ error: 'contractText is required' })

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

  const contractExtracted = extractKeyContractSections(contractText, 60000)
  const corrContent = correspondenceText ? correspondenceText.slice(0, 20000) : ''
  const hasProgrammes = programmes && programmes.length > 0
  const progContent = hasProgrammes
    ? programmes.map((p, i) => `=== PROGRAMME ${i + 1} (${i === 0 ? 'earliest' : 'latest'}) ===\n${p}`).join('\n\n')
    : ''

  const today = new Date().toISOString().split('T')[0]

  const systemPrompt = `You are a construction claims data extractor for Irish PW-CF3 contracts. Your ONLY job is to extract structured facts from documents. You do NOT calculate values — that is done by the software.

For EACH claimable event you find, extract:
- title: specific descriptive name
- claimType: exactly "Compensation Event" OR "Variation Order" OR "Additional Works"
- description: what happened, who is responsible, contractual basis
- blockedFrom: the date the event started/task was blocked (format YYYY-MM-DD). Use the Start date from the programme. If not in documents write null.
- blockedTo: the date the blockage ended or was resolved (format YYYY-MM-DD). If STILL ONGOING in the latest programme, write null and set stillOngoing: true.
- stillOngoing: true if the task is still blocked/unresolved in the latest document, false if resolved
- missingData: if you cannot determine blockedFrom or blockedTo, describe exactly what information is needed e.g. "Start date not in documents — requires site records". Write null if all dates are known.
- deadlineStatus: notice status under PW-CF3 28-day rule
- draftNotice: 3-4 sentence formal notice
- responsibleParty: who caused the delay/instructed the work
- programmeRef: task ID and programme number(s) e.g. "Task 9, Prog 1 & 2"
- clauseRef: relevant PW-CF3 clause

CRITICAL RULES:
- Scan EVERY line of the programmes for blocked tasks, access issues, utility conflicts, verbal instructions, COs
- Each separate event = separate claim (Plot 19 and Plot 21 are separate claims)
- For tasks in BOTH programmes: blockedFrom = Programme 1 start date, blockedTo = Programme 2 date (or null if still ongoing)
- For tasks only in latest programme: blockedFrom = that programme's start date, blockedTo = null (stillOngoing: true)
- DO NOT calculate calendar days, working days, or monetary values — the software does this
- Expect 10-20 claims on a typical Irish road scheme

Return ONLY valid JSON: { "claims": [ ...ClaimEvent objects... ] }`

  // Extract latest date from programmes for use as blockedTo on ongoing tasks
  // Avoids ever-increasing values — uses last confirmed evidence date
  function extractLatestDate(text: string): string {
    const matches = text.match(/\b(\d{2}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})\b/g) ?? []
    const dates = matches.map(d => {
      if (d.includes('/')) { const [dd, mm, yy] = d.split('/'); return `20${yy}-${mm}-${dd}` }
      return d
    }).filter(d => d >= '2020-01-01' && d <= '2030-01-01').sort()
    return dates[dates.length - 1] ?? today
  }
  const latestProgDate = hasProgrammes ? extractLatestDate(programmes[programmes.length - 1]) : today
  const userContent = [
    hasProgrammes ? `LATEST PROGRAMME DATE: ${latestProgDate} (use as blockedTo for tasks still ongoing in this programme — do NOT use today's date)\n\nLOOKAHEAD PROGRAMMES:\n${progContent}` : `TODAY'S DATE: ${today}`,
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
          temperature: 0,  // Zero temperature — maximum determinism for fact extraction
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

    const result = JSON.parse(jsonMatch[0]) as { claims?: ClaimEvent[] }
    return res.status(200).json({ claims: result.claims ?? [] })

  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}

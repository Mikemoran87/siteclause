import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contractText, correspondenceText } = req.body

  if (!contractText) {
    return res.status(400).json({ error: 'contractText is required' })
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' })
  }

  // Extract the most relevant sections from a long contract rather than truncating blindly
  function extractKeyContractSections(text: string, maxChars: number): string {
    // GPT-4o supports 128k tokens (~480k chars) — use generously
    if (text.length <= maxChars) return text

    const keywords = [
      'variation', 'Variation', 'change order', 'Change Order',
      'compensation event', 'Compensation Event',
      'extension of time', 'Extension of Time',
      'delay', 'Delay', 'notice', 'Notice',
      'payment', 'Payment', 'valuation', 'Valuation',
      'bill of quantities', 'Bill of Quantities', 'rate', 'Rate',
      'day rate', 'Day Rate', 'working day', 'Working Day',
      'loss and expense', 'Loss and Expense',
      'dispute', 'Dispute', 'adjudication',
    ]

    const sections: Array<{ idx: number; text: string }> = []
    const seen = new Set<number>()

    for (const kw of keywords) {
      let searchFrom = 0
      while (searchFrom < text.length) {
        const idx = text.indexOf(kw, searchFrom)
        if (idx === -1) break
        const blockStart = Math.max(0, idx - 200)
        // Avoid duplicate overlapping blocks
        if (!seen.has(Math.floor(blockStart / 400))) {
          seen.add(Math.floor(blockStart / 400))
          sections.push({ idx: blockStart, text: text.slice(blockStart, blockStart + 600) })
        }
        searchFrom = idx + kw.length
      }
    }

    // Sort by position, deduplicate, take first N chars
    sections.sort((a, b) => a.idx - b.idx)
    let result = ''
    for (const s of sections) {
      if (result.length + s.text.length > maxChars) break
      result += s.text + '\n---\n'
    }
    return result || text.slice(0, maxChars)
  }

  // GPT-4o 128k tokens ≈ 480k chars. Vercel 30s timeout limits how much we can send safely.
  // 100k contract + 40k correspondence = safe and comprehensive
  const contractContent = extractKeyContractSections(contractText, 100000)
  const corrContent = correspondenceText ? correspondenceText.slice(0, 40000) : 'No correspondence provided'

  const prompt = `You are SiteClause, an expert AI construction contract lawyer specialising in Irish Public Works contracts (PW-CF3, PW-CF1 etc), JCT, NEC, FIDIC and RIAI contracts. Your job is to protect subcontractors and main contractors by identifying EVERY variation claim and compensation event they are entitled to.

IMPORTANT: Be exhaustive. Do not miss any claim. Each separate event = a separate claim. Look carefully at:
- Change Orders instructed or implied
- Compensation Events under PW-CF3 Schedule K (utility diversions, access delays, employer failures)
- Late instructions, late information, RFI responses outstanding
- Variations instructed verbally or in writing but not formally valued
- Out-of-sequence working
- Acceleration instructions
- Day rate claims for delay
- Loss and expense

Analyse the documents below and return a JSON object exactly matching this schema — no other text, just the JSON:

{
  "projectName": "string",
  "contractType": "string — e.g. PW-CF3 v2.8, JCT Subcontract 2016 etc",
  "totalClaimValue": "string — formatted total",
  "summary": "string — 2-3 sentences",
  "claims": [
    {
      "id": "VC-001",
      "title": "Short descriptive title",
      "severity": "urgent | valid | review",
      "clause": "Relevant contract clause",
      "description": "2-3 sentences explaining the claim and entitlement",
      "estimatedValue": "Value ALL claims using the Contractor Day Rate (PW-CF3 Clause 10.6.4 day work method). If day rate is in the rate card, calculate: working days impacted × day rate. Show working e.g. '33 days × €5,000 = €165,000'. Convert calendar days to working days (×0.714). If no day rate available write: 'X working days × Contractor Day Rate (Part 2D)'.",
      "deadlineStatus": "e.g. Notice required within 28 days | EXPIRED — submit immediately",
      "draftNotice": "Full formal notice text referencing the specific clause and event"
    }
  ],
  "deadlines": [
    {
      "clause": "e.g. Cl. 10.1",
      "description": "e.g. Compensation Event notice — 28 days from event",
      "status": "on-track | urgent | expired"
    }
  ]
}

CONTRACT DOCUMENTS (key sections extracted):
${contractContent}

SITE CORRESPONDENCE:
${corrContent}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const err = await response.json() as { error?: { message: string } }
      return res.status(500).json({ error: err.error?.message || 'OpenAI API error' })
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    const result = JSON.parse(data.choices[0].message.content) as Record<string, unknown>
    result.contractText = contractText.slice(0, 12000)
    return res.status(200).json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return res.status(500).json({ error: msg })
  }
}

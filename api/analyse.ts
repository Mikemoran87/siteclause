import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contractText, correspondenceText, rateContext } = req.body

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

  const prompt = `You are SiteClause, an expert AI construction contract lawyer specialising in Irish Public Works contracts (PW-CF3, PW-CF1, PW-CF5), JCT, NEC, FIDIC and RIAI contracts. Your job is to protect subcontractors by identifying EVERY variation claim and compensation event they are entitled to.

CRITICAL INSTRUCTION: Be EXHAUSTIVE. A typical Irish PW-CF3 subcontract on a €2m+ project will have 10-30 claimable events. If you find fewer than 8, you are almost certainly missing claims. Do NOT summarise or group claims — each separate event, instruction, delay, utility conflict, or access issue = a SEPARATE claim with its own entry.

PW-CF3 COMPENSATION EVENT TRIGGERS (Schedule K) — flag ANY event matching these, even if not described as a claim:
1. Any instruction issued by the Employer's Representative (verbal OR written) — including site directions, design changes, specification changes
2. Employer or CCC failure to give possession of any plot, section or area of the site on time
3. Employer or CCC failure to provide information, drawings, approvals or responses to RFIs on time
4. Discovery of unforeseen physical conditions (rock, contamination, undocumented utilities, ground conditions not in the geotech)
5. Any utility conflict or diversion — ESB, Eir, Irish Water, Gas Networks, Enet, OpenEir — each utility = separate claim
6. Any third party (landowner, statutory authority) delay caused by Employer failure to obtain agreements/wayleaves
7. Weather events exceeding the tendered allowances in the FTS Schedule of Tender Assumptions
8. Any Employer risk event under the contract
9. Any change in statutory requirements or permissions affecting the works
10. Late or missing design information, drawing revisions, RFI responses

VARIATION ORDER TRIGGERS — flag ANY of these:
- Any verbal instruction to do work outside original scope
- Any change to drawings, specification or method
- Any instruction to omit works
- Any instruction that alters sequence, timing or access
- Any Change Order mentioned but not yet formally valued or agreed
- Any "we'll sort the paperwork later" type instruction

CRITICAL: Do NOT require explicit claim language. If a site narrative says "Rock was encountered at Ch400" — that is a Compensation Event under Schedule K Item 4. If it says "Eir pole remains in conflict" — that is Schedule K Item 5. If it says "CCC to agree access with Plot 19" — that is Schedule K Item 2. Flag these automatically based on what happened, not on whether anyone called it a claim.

Each plot access issue = separate claim. Each utility conflict = separate claim. Each outstanding RFI = potential claim. Each verbal instruction = potential VO.

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
      "estimatedValue": "If programme documents are provided, use actual task Start and Finish dates to calculate calendar days, convert to working days (×0.714), multiply by day rate. Show full working e.g. 'Blocked 30/03/26 – 11/05/26 = 42 calendar days = 30 working days × €5,000 = €150,000'. If no programme dates available but correspondence shows dates, use those. If no dates available at all write 'Requires programme dates to value accurately'. NEVER invent figures.",
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

${rateContext ? `RATE CARD (MANDATORY — use these exact rates to calculate all claim values):
${rateContext}

` : ''}CONTRACT DOCUMENTS (key sections extracted):
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

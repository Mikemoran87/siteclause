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

  const prompt = `You are SiteClause, an expert AI construction contract lawyer specialising in JCT, NEC, FIDIC and RIAI contracts. Your job is to protect subcontractors and contractors by identifying every variation claim they are entitled to, tracking contractual deadlines, and drafting formal notices.

Analyse the following documents and return a JSON object exactly matching this schema — no other text, just the JSON:

{
  "projectName": "string — infer from documents or use 'Project'",
  "contractType": "string — e.g. JCT Subcontract 2016, NEC4, RIAI etc",
  "totalClaimValue": "string — formatted total e.g. '€126,900' or 'Est. €45,000-€60,000'",
  "summary": "string — 2-3 sentence plain English summary of the key findings for the contractor",
  "claims": [
    {
      "id": "VC-001",
      "title": "Short descriptive title",
      "severity": "urgent | valid | review",
      "clause": "Relevant contract clause e.g. Cl. 5.1",
      "description": "2-3 sentences explaining the claim, the event that gave rise to it, and why the contractor is entitled",
      "estimatedValue": "e.g. Est. €34,200",
      "deadlineStatus": "e.g. 7 days remaining to submit notice | EXPIRED - submit immediately",
      "draftNotice": "Full formal variation/delay notice text ready to send, addressed to the main contractor, referencing the specific clause and event"
    }
  ],
  "deadlines": [
    {
      "clause": "e.g. Cl. 4.3",
      "description": "e.g. Monthly Payment Application",
      "status": "on-track | urgent | expired"
    }
  ]
}

Rules:
- severity "urgent" = deadline expired or expiring within 5 days
- severity "valid" = clear entitlement, deadline still open
- severity "review" = potential entitlement but needs more evidence
- Be specific and cite actual dates, amounts, and clause numbers where possible
- Draft notices must be formal, professional, and legally precise
- If contract type cannot be determined, use standard construction contract principles
- Always find at least 2-3 claims if there is any correspondence showing extra work, delays, or changes

CONTRACT:
${contractText.slice(0, 8000)}

SITE CORRESPONDENCE:
${correspondenceText ? correspondenceText.slice(0, 8000) : 'No correspondence provided'}`

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
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(500).json({ error: err.error?.message || 'OpenAI API error' })
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    result.contractText = contractText.slice(0, 12000)
    return res.status(200).json(result)
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' })
  }
}

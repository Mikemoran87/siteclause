import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, contractText } = req.body
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are SiteClause, an expert AI construction contract advisor. You have read the following subcontract and can answer any question about it clearly and precisely.

Your job is to help contractors and subcontractors understand their rights, obligations, and entitlements under this contract. Always:
- Answer in plain English — no legal jargon unless asked
- Reference specific clause numbers when relevant
- Be direct and practical — tell them what they can actually do
- If they ask about claiming something, tell them the exact steps and deadlines
- Always add a brief disclaimer at the end: "Note: This is AI-generated guidance, not legal advice."

CONTRACT:
${contractText ? contractText.slice(0, 10000) : 'No contract loaded'}`
          },
          ...messages
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(500).json({ error: err.error?.message || 'OpenAI error' })
    }

    const data = await response.json()
    return res.status(200).json({ reply: data.choices[0].message.content })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' })
  }
}

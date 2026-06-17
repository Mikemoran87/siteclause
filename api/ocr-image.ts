import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageBase64, mimeType } = req.body

    if (!imageBase64) return res.status(400).json({ error: 'No image provided' })

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are extracting text from a screenshot of site correspondence (WhatsApp messages, emails, letters, site instructions). 

Extract ALL text exactly as it appears. Preserve message structure, sender names, timestamps if visible, and conversation flow. Format it clearly with line breaks between messages.

If this is a WhatsApp conversation, format each message as:
[Sender name/number]: message text

If this is an email, preserve the From/To/Subject/Date headers.

Only output the extracted text — no commentary, no explanation.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } }
      return res.status(500).json({ error: err.error?.message || 'OpenAI API error' })
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    const extractedText = data.choices[0]?.message?.content || ''
    return res.status(200).json({ text: extractedText })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OCR failed'
    console.error('OCR error:', err)
    return res.status(500).json({ error: message })
  }
}

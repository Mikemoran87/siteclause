import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractText } from 'unpdf'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdfBase64, filename } = req.body as { pdfBase64?: string; filename?: string }
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' })

    const buffer = Buffer.from(pdfBase64, 'base64')
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
    return res.status(200).json({ text: `[PDF: ${filename || 'contract.pdf'}]\n\n${text}` })
  } catch (err: unknown) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    return res.status(500).json({ error: msg })
  }
}

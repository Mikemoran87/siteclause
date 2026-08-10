import type { VercelRequest, VercelResponse } from '@vercel/node'
import pdfParse from 'pdf-parse'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdfBase64, filename } = req.body
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' })

    const buffer = Buffer.from(pdfBase64, 'base64')
    const data = await pdfParse(buffer)
    const text = `[PDF: ${filename || 'contract.pdf'}]\n\n${data.text}`
    return res.status(200).json({ text })
  } catch (err: unknown) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    return res.status(500).json({ error: msg })
  }
}

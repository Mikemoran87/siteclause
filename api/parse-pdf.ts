import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdfBase64, filename } = req.body
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' })

    const buffer = Buffer.from(pdfBase64, 'base64')

    // Use pdf-parse which works reliably in Node.js serverless
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)

    const text = `[PDF: ${filename || 'contract.pdf'}]\n\n${data.text}`
    return res.status(200).json({ text })
  } catch (err: unknown) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    return res.status(500).json({ error: msg })
  }
}

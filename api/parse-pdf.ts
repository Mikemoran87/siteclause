import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdfBase64, filename } = req.body as { pdfBase64?: string; filename?: string }
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' })

    const buffer = Buffer.from(pdfBase64, 'base64')
    const text = await parsePdf(buffer, filename || 'contract.pdf')
    return res.status(200).json({ text })
  } catch (err: unknown) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    return res.status(500).json({ error: msg })
  }
}

async function parsePdf(buffer: Buffer, filename: string): Promise<string> {
  // Use pdf-parse with explicit require to avoid ESM issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = mod.default ?? mod
  const data = await pdfParse(buffer)
  return `[PDF: ${filename}]\n\n${data.text}`
}

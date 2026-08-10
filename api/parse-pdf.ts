import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdfBase64, filename } = req.body

    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' })

    // Dynamically import pdfjs on server side
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string)

    const buffer = Buffer.from(pdfBase64, 'base64')
    const uint8 = new Uint8Array(buffer)

    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise
    const lines: string[] = [`[PDF: ${filename || 'contract.pdf'}]`]

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: unknown) => {
          const it = item as { str?: string }
          return it.str ?? ''
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (pageText) lines.push(pageText)
    }

    return res.status(200).json({ text: lines.join('\n') })
  } catch (err: unknown) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    return res.status(500).json({ error: msg })
  }
}

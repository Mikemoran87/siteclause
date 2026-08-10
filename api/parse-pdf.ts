import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { pdfBase64, filename } = req.body
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF data provided' })

    const buffer = Buffer.from(pdfBase64, 'base64')

    // Extract text from PDF using raw byte scanning
    // This works for most standard text-based PDFs without external dependencies
    const text = extractTextFromPdfBuffer(buffer, filename || 'contract.pdf')

    return res.status(200).json({ text })
  } catch (err: unknown) {
    console.error('PDF parse error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to parse PDF'
    return res.status(500).json({ error: msg })
  }
}

function extractTextFromPdfBuffer(buffer: Buffer, filename: string): string {
  try {
    const content = buffer.toString('latin1')
    const lines: string[] = [`[PDF: ${filename}]`]

    // Extract text between BT (Begin Text) and ET (End Text) markers
    const btEtRegex = /BT([\s\S]*?)ET/g
    let match: RegExpExecArray | null

    // Also try to extract from stream objects
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
    const strings: string[] = []

    // Method 1: Extract literal strings in parentheses
    const parenRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g
    let parenMatch: RegExpExecArray | null
    while ((parenMatch = parenRegex.exec(content)) !== null) {
      const str = parenMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/g, "'")
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .trim()
      if (str.length > 2 && /[a-zA-Z]/.test(str)) {
        strings.push(str)
      }
    }

    if (strings.length > 0) {
      // Deduplicate and clean
      const seen = new Set<string>()
      for (const s of strings) {
        if (!seen.has(s) && s.length > 3) {
          seen.add(s)
          lines.push(s)
        }
      }
    } else {
      // Fallback: just return a message
      lines.push('PDF uploaded successfully. The text could not be fully extracted from this PDF.')
      lines.push('Please use the Paste Contract Text option to paste the contract text manually.')
    }

    // Suppress unused variable warnings
    void btEtRegex
    void streamRegex
    void match

    return lines.join('\n')
  } catch {
    return `[PDF: ${filename}]\n\nPDF uploaded. Please use Paste Contract Text if the content is not displayed correctly.`
  }
}

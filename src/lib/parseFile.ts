import * as XLSX from 'xlsx'
import mammoth from 'mammoth'

/**
 * Parse any supported file type into plain text for AI analysis.
 * Supports: .txt, .pdf (via server), .docx, .doc, .csv, .xlsx, .xls
 */
export async function parseFileToText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  // PDF — parsed server-side (avoids DOMMatrix/browser API issues)
  if (ext === 'pdf') {
    return parsePdfViaServer(file)
  }

  // Word documents
  if (['docx', 'doc'].includes(ext)) {
    return parseWordDoc(file)
  }

  // Excel / CSV
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return parseSpreadsheet(file)
  }

  // Plain text / anything else
  return file.text()
}

async function parsePdfViaServer(file: File): Promise<string> {
  const base64 = await fileToBase64(file)
  const response = await fetch('/api/parse-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64: base64, filename: file.name }),
  })
  const data = await response.json() as { text?: string; error?: string }
  if (!response.ok || data.error) throw new Error(data.error || 'Failed to parse PDF')
  return data.text || ''
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip data URL prefix, keep only base64
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function parseWordDoc(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return `[Word Document: ${file.name}]\n\n${result.value}`
}

async function parseSpreadsheet(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const lines: string[] = [`[Spreadsheet: ${file.name}]`]

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    if (rows.length === 0) continue
    lines.push(`\n--- Sheet: ${sheetName} ---`)
    for (const row of rows) {
      const cells = row.map((cell) => String(cell ?? '').trim())
      if (cells.some((c) => c !== '')) lines.push(cells.join('\t'))
    }
  }

  return lines.join('\n')
}

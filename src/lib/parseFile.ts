import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Use bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

/**
 * Parse any supported file type into plain text for AI analysis.
 * Supports: .txt, .pdf, .docx, .doc, .csv, .xlsx, .xls
 */
export async function parseFileToText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  // PDF
  if (ext === 'pdf') {
    return parsePdf(file)
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

async function parsePdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const lines: string[] = [`[PDF: ${file.name}]`]

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: unknown) => {
        const i = item as { str?: string }
        return i.str ?? ''
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) lines.push(pageText)
  }

  return lines.join('\n')
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
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
    })

    if (rows.length === 0) continue

    lines.push(`\n--- Sheet: ${sheetName} ---`)

    for (const row of rows) {
      const cells = row.map((cell) => String(cell ?? '').trim())
      if (cells.some((c) => c !== '')) {
        lines.push(cells.join('\t'))
      }
    }
  }

  return lines.join('\n')
}

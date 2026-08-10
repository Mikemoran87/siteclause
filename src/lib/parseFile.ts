import * as XLSX from 'xlsx'
import mammoth from 'mammoth'

/**
 * Parse any supported file type into plain text for AI analysis.
 * Supports: .txt, .pdf (text-based), .csv, .xlsx, .xls, .docx
 */
export async function parseFileToText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  // Word documents
  if (['docx', 'doc'].includes(ext)) {
    return parseWordDoc(file)
  }

  // Excel / CSV
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return parseSpreadsheet(file)
  }

  // Plain text / PDF / anything else — read as text
  return file.text()
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
      // Only include rows that have at least one non-empty cell
      if (cells.some((c) => c !== '')) {
        lines.push(cells.join('\t'))
      }
    }
  }

  return lines.join('\n')
}

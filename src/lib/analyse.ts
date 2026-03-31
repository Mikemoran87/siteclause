import type { AnalysisResult } from '../types'

async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export async function analyseDocuments(
  contract: File,
  correspondence: File[],
  pastedText: string = ''
): Promise<AnalysisResult> {
  const contractText = await readFileText(contract)
  const corrTexts = await Promise.all(correspondence.map(readFileText))
  const correspondenceText = [
    ...corrTexts,
    pastedText.trim() ? `--- PASTED MESSAGES ---\n${pastedText.trim()}` : ''
  ].filter(Boolean).join('\n\n--- NEXT DOCUMENT ---\n\n')

  const response = await fetch('/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractText, correspondenceText }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Analysis failed')
  }

  return response.json()
}

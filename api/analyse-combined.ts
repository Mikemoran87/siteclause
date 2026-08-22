import type { VercelRequest, VercelResponse } from '@vercel/node'

// AI returns claim references — task IDs + type only. No dates, no maths.
// All calculation is done in the frontend from parsed programme data.
export interface ClaimRef {
  prog1TaskId: string | null   // Task ID in Programme 1 (null if not in Prog 1)
  prog2TaskId: string | null   // Task ID in Programme 2 (null if not in Prog 2)
  title: string
  claimType: 'Compensation Event' | 'Variation Order' | 'Additional Works'
  description: string
  deadlineStatus: string
  draftNotice: string
  responsibleParty: string
  clauseRef: string
  missingData: string | null   // what's needed if dates can't be found
}

// Compact task serialiser — gives AI just what it needs to identify claims
function serialiseTasks(text: string, progNum: number): { header: string; taskLines: string } {
  const lines = text.split('\n')
  const tasks: string[] = []
  let current = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('ID Name')) continue
    // New task: non-zero integer ID. Lines starting "0 days..." are duration rows for multi-line tasks.
    const newTaskMatch = trimmed.match(/^(\d+)\s/)
    const isNewTask = newTaskMatch && parseInt(newTaskMatch[1], 10) > 0
    if (isNewTask) {
      if (current) { const parsed = buildTaskLine(current); if (parsed) tasks.push(parsed) }
      current = trimmed
    } else {
      current += ' ' + trimmed
    }
  }
  if (current) {
    const parsed = buildTaskLine(current)
    if (parsed) tasks.push(parsed)
  }

  const wcMatch = text.match(/W\/C\s+(\d{1,2}[.\s]+\d{2}[.\s]+\d{2,4})/i)
  const wc = wcMatch ? wcMatch[1].trim() : 'unknown'
  return {
    header: `PROGRAMME ${progNum} (W/C ${wc}):`,
    taskLines: tasks.join('\n'),
  }
}

function buildTaskLine(line: string): string | null {
  const idMatch = line.match(/^(\d+)\s/)
  if (!idMatch) return null
  const id = idMatch[1]
  const durMatch = line.match(/(\d+)\s+days?\??/)
  if (!durMatch) return null
  const dur = parseInt(durMatch[1], 10)
  // CRITICAL: extract dates AFTER the duration field only
  // Task names contain historical reference dates that must be ignored
  const afterDur = line.slice(durMatch.index! + durMatch[0].length)
  const dates = afterDur.match(/\d{1,2}\/\d{2}\/\d{2,4}/g) ?? []
  if (dates.length < 2) return null
  let name = line.replace(/^\d+\s+/, '').replace(/\s+\d+\s+days?\??\s+.*$/, '').replace(/\s+\d{1,2}\/\d{2}\/.*$/, '').trim()
  if (name.length < 3) return null
  return `[${id}] ${name} | ${dates[0]}→${dates[1]} | ${dur}d`
}

function extractContractSections(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const kws = ['variation', 'compensation event', 'notice', 'delay', 'day rate', 'working day', 'loss and expense', 'extension of time']
  const sections: Array<{ idx: number; text: string }> = []
  const seen = new Set<number>()
  for (const kw of kws) {
    let from = 0
    while (from < text.length) {
      const idx = text.toLowerCase().indexOf(kw, from)
      if (idx === -1) break
      const start = Math.max(0, idx - 200)
      const key = Math.floor(start / 400)
      if (!seen.has(key)) { seen.add(key); sections.push({ idx: start, text: text.slice(start, start + 600) }) }
      from = idx + kw.length
    }
  }
  sections.sort((a, b) => a.idx - b.idx)
  let result = ''
  for (const s of sections) {
    if (result.length + s.text.length > maxChars) break
    result += s.text + '\n---\n'
  }
  return result || text.slice(0, maxChars)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { contractText, correspondenceText, programmes } = req.body as {
    contractText?: string
    correspondenceText?: string
    programmes?: string[]
  }

  if (!contractText) return res.status(400).json({ error: 'contractText is required' })
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

  const contractExtracted = extractContractSections(contractText, 30000)
  const corrContent = correspondenceText ? correspondenceText.slice(0, 10000) : ''
  const hasProgrammes = programmes && programmes.length > 0

  // Serialise all programmes as compact task tables
  const progSections = hasProgrammes
    ? programmes.map((p, i) => {
        const { header, taskLines } = serialiseTasks(p, i + 1)
        return `${header}\n${taskLines}`
      }).join('\n\n')
    : ''

  const systemPrompt = `You are a construction claims identifier specialising in Irish PW-CF3 public works contracts. You are given programme task tables with exact dates already parsed.

Your ONLY job: identify which tasks are claimable events (Compensation Events, Variation Orders, Additional Works).

For each claim, return the task IDs from the programme tables. The software will look up the exact start/finish dates and calculate the value. You do NOT calculate anything.

PW-CF3 SCHEDULE K — COMPENSATION EVENT TRIGGERS (flag ANY task matching these, regardless of wording):
1. Employer/CCC instruction (verbal or written) — any direction, design change, scope change
2. Employer/CCC failure to give possession of any plot, section or area on time
3. Employer/CCC failure to provide information, drawings, RFI responses on time
4. Unforeseen physical conditions — rock, contamination, undocumented utilities, conditions not in geotech
5. Utility conflict or diversion — ESB, Eir, Irish Water, Gas Networks, Enet, OpenEir — EACH utility = separate claim
6. Third party delay caused by Employer failure to obtain wayleaves or landowner agreements
7. Weather exceeding tendered FTS Schedule allowances
8. Any Employer risk event
9. Change in statutory requirements or permissions

VARIATION ORDER TRIGGERS:
- Verbal instructions for out-of-scope works
- Drawing or specification changes
- Instructions that alter sequence, timing or access
- Change Orders mentioned but not formally valued
- Works instructed informally ("we'll sort it later")

CRITICAL RULES:
- Do NOT require explicit claim language. "Rock encountered at Ch400" = Compensation Event Item 4. "Eir pole in conflict for several months" = Item 5. "CCC to agree access Plot 19" = Item 2. "ESB wayleave outstanding" = Item 5. Flag by what HAPPENED not by what was CALLED.
- Each plot access issue = separate claim
- Each utility conflict (ESB.08, ESB.09, Eir Conflict.02 etc) = separate claim
- Each outstanding RFI that is blocking works = separate claim
- Tasks present in BOTH programmes = persistent ongoing delay (populate both prog1TaskId and prog2TaskId)
- Tasks only in Programme 2 = new event since last lookahead

Return ONLY valid JSON: { "claims": [ { "prog1TaskId": "9" or null, "prog2TaskId": "4" or null, "title": "...", "claimType": "Compensation Event|Variation Order|Additional Works", "description": "...", "deadlineStatus": "...", "draftNotice": "3-4 sentence formal notice citing PW-CF3 clause", "responsibleParty": "...", "clauseRef": "e.g. PW-CF3 Cl. 10.3", "missingData": null } ] }`

  const userContent = [
    hasProgrammes ? `PROGRAMME TASK TABLES (task IDs, names, exact dates):\n${progSections}` : '',
    corrContent ? `CORRESPONDENCE:\n${corrContent}` : '',
    `CONTRACT KEY CLAUSES:\n${contractExtracted}`,
  ].filter(Boolean).join('\n\n')

  try {
    let response: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 6000,
        }),
      })
      if (response.status !== 429) break
      await new Promise(r => setTimeout(r, parseInt(response!.headers.get('retry-after') ?? '10', 10) * 1000))
    }
    if (!response) return res.status(500).json({ error: 'No response from OpenAI' })

    const data = await response.json() as { choices?: Array<{ message: { content: string } }>; error?: { message: string } }
    if (!response.ok || data.error) return res.status(500).json({ error: data.error?.message ?? 'OpenAI API error' })

    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'No valid JSON in response' })

    const result = JSON.parse(jsonMatch[0]) as { claims?: ClaimRef[] }
    // Also return the serialised programme data so frontend can look up dates by task ID
    return res.status(200).json({ claims: result.claims ?? [], progSections })

  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}

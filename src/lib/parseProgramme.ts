// Deterministic MS Project text parser
// Extracts task rows with exact dates — no AI, no interpretation

export interface ProgrammeTask {
  id: string
  name: string
  duration: string
  durationDays: number
  start: string | null   // ISO YYYY-MM-DD
  finish: string | null  // ISO YYYY-MM-DD
  isZeroDuration: boolean
  rawLine: string
}

export interface ParsedProgramme {
  weekCommencing: string | null
  tasks: ProgrammeTask[]
}

function parseMSProjectDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!match) return null
  const [, day, month, year] = match
  const fullYear = year.length === 2 ? `20${year}` : year
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseTaskLine(line: string): ProgrammeTask | null {
  const idMatch = line.match(/^(\d+)\s/)
  if (!idMatch) return null

  const id = idMatch[1]
  const durMatch = line.match(/(\d+)\s+days?\??/)
  if (!durMatch) return null
  const durationDays = parseInt(durMatch[1], 10)
  const isZeroDuration = durationDays === 0

  // CRITICAL: always use dates AFTER the duration field
  // Task names can contain embedded historical dates (e.g. "notice given on 18/08/25")
  // The actual programme milestone dates come after "X days"
  const afterDuration = line.slice(durMatch.index! + durMatch[0].length)
  const datesAfterDur = afterDuration.match(/\d{1,2}\/\d{2}\/\d{2,4}/g) ?? []
  if (datesAfterDur.length < 2) return null

  const start = parseMSProjectDate(datesAfterDur[0] ?? '')
  const finish = parseMSProjectDate(datesAfterDur[1] ?? '')

  // Name: strip ID prefix, then strip everything after duration pattern or first date
  let name = line.replace(/^\d+\s+/, '')
  // Remove trailing "X days? dd/mm/yy dd/mm/yy ..." 
  name = name.replace(/\s+\d+\s+days?\??\s+\w{3}\s+\d{1,2}\/\d{2}\/.*$/, '')
  // Remove trailing date if still present
  name = name.replace(/\s+\d{1,2}\/\d{2}\/\d{2,4}.*$/, '')
  name = name.replace(/\s+/g, ' ').trim()

  if (!name || name.length < 3) return null

  return { id, name, durationDays, duration: `${durationDays} days`, start, finish, isZeroDuration, rawLine: line }
}

export function parseProgramme(text: string): ParsedProgramme {
  const tasks: ProgrammeTask[] = []
  const lines = text.split('\n')
  let current = ''

  // Extract week commencing date from header
  const wcMatch = text.match(/W\/C\s+(\d{1,2})[.\s]+(\d{2})[.\s]+(\d{2,4})/i)
  let weekCommencing: string | null = null
  if (wcMatch) {
    const [, day, month, year] = wcMatch
    const fullYear = year.length === 2 ? `20${year}` : year
    weekCommencing = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('ID Name Duration')) continue

    // A new task starts with a non-zero integer ID followed by a space
    // Lines like "0 days Mon 30/03/26..." are duration/date rows for multi-line tasks
    // Lines like "0 days" alone are continuation rows — treat as continuation
    const newTaskMatch = trimmed.match(/^(\d+)\s/)
    const isNewTask = newTaskMatch && parseInt(newTaskMatch[1], 10) > 0

    if (isNewTask) {
      if (current) {
        const task = parseTaskLine(current)
        if (task) tasks.push(task)
      }
      current = trimmed
    } else {
      // Continuation: duration/date line or wrapped name
      current += ' ' + trimmed
    }
  }
  if (current) {
    const task = parseTaskLine(current)
    if (task) tasks.push(task)
  }

  return { weekCommencing, tasks }
}

// Serialise tasks for AI input — compact format with exact dates
export function serialiseProgrammeForAI(prog: ParsedProgramme, progNumber: number): string {
  const header = `PROGRAMME ${progNumber} (W/C ${prog.weekCommencing ?? 'unknown'}):`
  const rows = prog.tasks.map(t =>
    `[${t.id}] ${t.name} | Start:${t.start ?? '?'} Finish:${t.finish ?? '?'} Duration:${t.duration}`
  ).join('\n')
  return `${header}\n${rows}`
}

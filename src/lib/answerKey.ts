import type { AnswerKind } from './scoring'

export interface KeyRow {
  question_number: number
  correct_answer: string
  question_type: AnswerKind
  rubric?: string | null
  max_points: number
}

/** Best-effort guess of a question's kind from its answer text. */
export function detectKind(answer: string): AnswerKind {
  const a = answer.trim()
  if (/^[a-e]$/i.test(a)) return 'multiple_choice'
  if (/^(true|false|t|f)$/i.test(a)) return 'true_false'
  return 'identification'
}

/**
 * Map a `# Heading` line to an answer kind. Headings let the teacher declare
 * parts explicitly so they are never mis-guessed (e.g. a coding or essay part).
 */
export function headingToKind(line: string): AnswerKind | null {
  const h = line.replace(/^#+/, '').trim().toLowerCase()
  if (!h) return null
  // Match stems (not whole words) so "Coding", "Debugging", "Programming", "Essays" all work.
  if (/\b(multi|multiple|choice|\bmc\b)/.test(h)) return 'multiple_choice'
  if (/\b(true|false|\btf\b|t\/f)/.test(h)) return 'true_false'
  if (/\b(identif|fill|short|enumera)/.test(h)) return 'identification'
  if (/\b(cod|debug|program|source|error|trace)/.test(h)) return 'coding'
  if (/\b(essay|rubric|discussion|problem|comput)/.test(h)) return 'essay'
  return null
}

/**
 * Parse a pasted answer key.
 *
 * Lines are numbered continuously in the order they appear, IGNORING numbers
 * printed on the paper — so multi-part papers that restart at 1 each part are
 * handled correctly. Optional `# Heading` lines set the type for the questions
 * that follow them.
 */
export function parseAnswerKeyText(text: string): KeyRow[] {
  const lines = text.split(/\r?\n/)
  const hasHeadings = lines.some((l) => l.trim().startsWith('#'))
  const rows: KeyRow[] = []
  let autoNumber = 0
  let currentKind: AnswerKind | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('#')) {
      const kind = headingToKind(line)
      if (kind) currentKind = kind
      continue
    }

    const match = line.match(/^(?:(\d+)[.):-]?\s*)?(.+)$/)
    if (!match) continue
    const answer = match[2].trim()
    if (!answer) continue

    autoNumber += 1
    // With headings we always number sequentially so restarted part numbers cannot collide.
    const questionNumber = hasHeadings ? autoNumber : match[1] ? Number(match[1]) : autoNumber
    const questionType = currentKind ?? detectKind(answer)
    rows.push({
      question_number: questionNumber,
      correct_answer: answer,
      question_type: questionType,
      max_points: questionType === 'essay' ? 10 : 1,
    })
  }

  const byNumber = new Map<number, KeyRow>()
  for (const row of rows) byNumber.set(row.question_number, row)
  return [...byNumber.values()].sort((a, b) => a.question_number - b.question_number)
}

import { needsTeacherReview } from './confidence'

export type AnswerKind = 'multiple_choice' | 'true_false' | 'identification' | 'coding' | 'essay'

export const ANSWER_KINDS: { value: AnswerKind; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple choice (A, B, C…)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'identification', label: 'Identification (one line of text)' },
  { value: 'coding', label: 'Coding / Debugging (verbatim code)' },
  { value: 'essay', label: 'Essay / Problem solving (rubric)' },
]

export interface StudentAnswer {
  question_number: number
  student_answer: string
  confidence?: number
  points?: number
  feedback?: string
}

export interface AnswerKeyItem {
  question_number: number
  correct_answer: string
  question_type?: string | null
  max_points?: number | null
}

export interface ScoredAnswer {
  question_number: number
  student_answer: string
  correct_answer: string
  is_correct: boolean
  confidence?: number
  review_status?: string
  needs_review?: boolean
  points_awarded: number
  max_points: number
  feedback?: string
  /** A conservative possible-equivalence hint that only a teacher can resolve. */
  consideration_reason?: string
}

function words(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function isContiguousSlice(shorter: string[], longer: string[]): boolean {
  if (shorter.length === 0 || shorter.length > longer.length) return false
  return longer.some((_, start) =>
    start + shorter.length <= longer.length &&
    shorter.every((word, offset) => word === longer[start + offset]),
  )
}

/**
 * Detect only explainable identification-answer variants. This never awards
 * credit; it creates a teacher-review consideration instead.
 */
export function considerationReason(studentAnswer: string, correctAnswer: string): string | undefined {
  const studentWords = words(studentAnswer)
  const keyWords = words(correctAnswer)
  if (!studentWords.length || !keyWords.length) return undefined

  const studentCompact = studentWords.join('')
  const keyCompact = keyWords.join('')
  if (studentCompact === keyCompact) return 'The answers differ only by spaces, underscores, hyphens, or punctuation.'

  const acronym = (items: string[]) => items.map((word) => word[0]).join('')
  const withoutParentheses = (value: string) => words(value.replace(/\([^)]*\)/g, ''))
  const parentheticalValues = (value: string) =>
    [...value.matchAll(/\(([^)]+)\)/g)].map((match) => words(match[1]).join('')).filter(Boolean)
  const acronymMatch =
    (studentCompact.length >= 3 && studentWords.length === 1 && studentCompact === acronym(withoutParentheses(correctAnswer))) ||
    (keyCompact.length >= 3 && keyWords.length === 1 && keyCompact === acronym(withoutParentheses(studentAnswer)))
  const parentheticalMatch = parentheticalValues(correctAnswer).includes(studentCompact) ||
    parentheticalValues(studentAnswer).includes(keyCompact)
  if (acronymMatch || parentheticalMatch) {
    return 'One answer appears to be an acronym or parenthetical form of the other.'
  }

  const [shorter, longer] = studentWords.length <= keyWords.length
    ? [studentWords, keyWords]
    : [keyWords, studentWords]
  if (shorter.length >= 2 && longer.length - shorter.length === 1 && isContiguousSlice(shorter, longer)) {
    return 'One answer contains the same phrase with one additional qualifier.'
  }
  return undefined
}

export interface ScoreResult {
  score: number
  total: number
  details: ScoredAnswer[]
}

/** Preserve code semantics: only normalize line endings and surrounding whitespace. */
export function normalizeCode(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

export function normalizeAnswer(value: string, type?: string | null): string {
  const trimmed = value.trim()
  if (type === 'true_false') {
    const lower = trimmed.toLowerCase()
    if (lower === 't' || lower === 'true') return 'true'
    if (lower === 'f' || lower === 'false') return 'false'
    return lower
  }
  if (type === 'multiple_choice') return trimmed.toUpperCase()
  if (type === 'coding') return normalizeCode(trimmed)
  return trimmed.replace(/\s+/g, ' ').toLowerCase()
}

function clampPoints(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, value))
}

/** Only explicit uppercase-only instructions affect automatic answer scoring. */
export function requiresUppercase(rules: string): boolean {
  return rules.split(/[\n.!;]+/).some((rule) =>
    !/\b(no|not|optional|ignore|allow|allowed)\b/i.test(rule) &&
    /\b(?:(?:upper[ -]?case|capital|block)\s*(?:letters?|answers?)?\s*only|only\s+(?:use\s+)?(?:upper[ -]?case|capital|block)(?:\s+letters?)?|all\s+(?:upper[ -]?case|capitals|caps)|(?:use|must be|write(?: answers)? in)\s+(?:upper[ -]?case|capital letters|block letters))\b/i.test(rule),
  )
}

export function answersMatch(student: string, key: AnswerKeyItem, rules = ''): boolean {
  if (requiresUppercase(rules) && student !== student.toUpperCase()) return false
  return normalizeAnswer(student, key.question_type) === normalizeAnswer(key.correct_answer, key.question_type)
}

export function calculateScore(
  answers: StudentAnswer[],
  key: AnswerKeyItem[],
  rules = '',
): ScoreResult {
  const answerMap = new Map(answers.map((a) => [a.question_number, a]))
  let score = 0
  const details: ScoredAnswer[] = []

  for (const k of key) {
    const a = answerMap.get(k.question_number)
    const maxPoints = k.max_points && k.max_points > 0 ? k.max_points : 1

    // Questions with no detected answer still count toward the total and are wrong.
    if (!a) {
      details.push({
        question_number: k.question_number,
        student_answer: '',
        correct_answer: k.correct_answer,
        is_correct: false,
        points_awarded: 0,
        max_points: maxPoints,
        needs_review: true,
      })
      continue
    }

    if (k.question_type === 'essay') {
      // Essay answers are always advisory: the AI suggests points against the rubric,
      // but the teacher confirms the final score (never silently final).
      const points = clampPoints(a.points ?? 0, maxPoints)
      score += points
      details.push({
        question_number: k.question_number,
        student_answer: a.student_answer,
        correct_answer: k.correct_answer,
        is_correct: points >= maxPoints,
        confidence: a.confidence,
        needs_review: true,
        points_awarded: points,
        max_points: maxPoints,
        feedback: a.feedback,
      })
      continue
    }

    const uppercaseViolation = requiresUppercase(rules) && a.student_answer !== a.student_answer.toUpperCase()
    const isCorrect = answersMatch(a.student_answer, k, rules)
    const consideration = !isCorrect && !uppercaseViolation && k.question_type === 'identification'
      ? considerationReason(a.student_answer, k.correct_answer)
      : undefined

    // Coding/debugging mismatches are never auto-failed: formatting differences are
    // common, so they are flagged for the teacher to decide.
    const invalidFormat = (k.question_type === 'multiple_choice' && !/^[A-Z]$/i.test(a.student_answer.trim())) ||
      (k.question_type === 'true_false' && !/^(true|false|t|f)$/i.test(a.student_answer.trim()))
    const needsReview = Boolean(consideration) || invalidFormat || (!isCorrect && k.question_type === 'coding') ||
      needsTeacherReview({ student_answer: a.student_answer, confidence: a.confidence })
    const points = isCorrect ? maxPoints : 0
    score += points
    details.push({
      question_number: k.question_number,
      student_answer: a.student_answer,
      correct_answer: k.correct_answer,
      is_correct: isCorrect,
      confidence: a.confidence,
      needs_review: needsReview,
      points_awarded: points,
      max_points: maxPoints,
      consideration_reason: consideration,
      feedback: uppercaseViolation ? 'Uppercase-only rule: the answer contains lowercase letters.' : undefined,
    })
  }

  const total = key.reduce((sum, k) => sum + (k.max_points && k.max_points > 0 ? k.max_points : 1), 0)
  return { score, total, details }
}

/** Sum the (possibly teacher-edited) awarded points. */
export function sumPoints(details: ScoredAnswer[]): number {
  return details.reduce((sum, d) => sum + (d.points_awarded ?? 0), 0)
}

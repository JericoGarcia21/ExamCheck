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
  /** AI-suggested points for essay / partial-credit questions. */
  points?: number
  /** Short feedback for essay questions. */
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
  /** True when the answer could not be confidently matched and the teacher should decide. */
  needs_review?: boolean
  points_awarded: number
  max_points: number
  feedback?: string
}

export interface ScoreResult {
  score: number
  total: number
  details: ScoredAnswer[]
}

/**
 * Lenient normalization for coding / debugging answers.
 * Ignores case, all whitespace, and the punctuation students vary most
 * (semicolons, braces and parentheses) so "class Dog extends Animal{}" matches "Class Dog extends Animal { }".
 */
export function normalizeCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/[;{}()]/g, '')
    .replace(/\s+/g, '')
}

export function normalizeAnswer(value: string, type?: string | null): string {
  const trimmed = value.trim()
  if (type === 'true_false') {
    const lower = trimmed.toLowerCase()
    if (lower === 't' || lower === 'true') return 'true'
    if (lower === 'f' || lower === 'false') return 'false'
    return lower
  }
  if (type === 'multiple_choice') return trimmed.toUpperCase().replace(/[^A-Z]/g, '')
  if (type === 'coding') return normalizeCode(trimmed)
  return trimmed.replace(/\s+/g, ' ').toLowerCase()
}

function clampPoints(value: number, max: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(max, value))
}

export function calculateScore(
  answers: StudentAnswer[],
  key: AnswerKeyItem[],
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
        needs_review: k.question_type === 'coding' || k.question_type === 'essay',
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

    const isCorrect =
      normalizeAnswer(a.student_answer, k.question_type) ===
      normalizeAnswer(k.correct_answer, k.question_type)

    // Coding/debugging mismatches are never auto-failed: formatting differences are
    // common, so they are flagged for the teacher to decide.
    const needsReview = !isCorrect && k.question_type === 'coding'
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
    })
  }

  const total = key.reduce((sum, k) => sum + (k.max_points && k.max_points > 0 ? k.max_points : 1), 0)
  return { score, total, details }
}

/** Sum the (possibly teacher-edited) awarded points. */
export function sumPoints(details: ScoredAnswer[]): number {
  return details.reduce((sum, d) => sum + (d.points_awarded ?? 0), 0)
}

export interface StudentAnswer {
  question_number: number
  student_answer: string
}

export interface AnswerKeyItem {
  question_number: number
  correct_answer: string
  question_type?: string | null
}

export interface ScoredAnswer {
  question_number: number
  student_answer: string
  correct_answer: string
  is_correct: boolean
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
  return trimmed.replace(/\s+/g, ' ').toLowerCase()
}

export function calculateScore(answers: StudentAnswer[], key: AnswerKeyItem[]): {
  score: number
  total: number
  details: ScoredAnswer[]
} {
  const keyMap = new Map(key.map((k) => [k.question_number, k]))
  let score = 0
  const details: ScoredAnswer[] = []

  for (const a of answers) {
    const k = keyMap.get(a.question_number)
    if (!k) continue
    const isCorrect =
      normalizeAnswer(a.student_answer, k.question_type) === normalizeAnswer(k.correct_answer, k.question_type)
    if (isCorrect) score++
    details.push({
      question_number: a.question_number,
      student_answer: a.student_answer,
      correct_answer: k.correct_answer,
      is_correct: isCorrect,
    })
  }

  return { score, total: key.length, details }
}

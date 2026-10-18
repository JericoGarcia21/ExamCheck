import type { AnswerRow } from '../types'
import type { KeyRow } from './answerKey'
import { calculateScore, sumPoints } from './scoring'

/** Restore teacher decisions for unchanged answers and retain any final override. */
export function restoreSavedResult(
  rows: KeyRow[],
  answers: AnswerRow[],
  edits: Record<number, string>,
  savedScore: number | null,
  calculatedScore: number | null,
) {
  const scored = calculateScore(answers.map(a => ({
    question_number: a.question_number,
    student_answer: edits[a.question_number] ?? a.student_answer ?? '',
    confidence: a.confidence ?? undefined,
  })), rows)
  const details = scored.details.map(d => {
    const saved = answers.find(a => a.question_number === d.question_number)
    return saved && (saved.student_answer ?? '') === d.student_answer
      ? { ...d, points_awarded: saved.points_awarded ?? d.points_awarded,
          is_correct: saved.is_correct ?? d.is_correct, confidence: saved.confidence ?? undefined,
          review_status: saved.review_status, needs_review: saved.needs_review ?? false,
          feedback: saved.feedback ?? undefined }
      : { ...d, review_status: 'pending', needs_review: true }
  })
  // Legacy records may predate calculated_score; their saved answer points are
  // the available baseline, rather than the newly edited answer scores.
  const baseline = calculatedScore ?? answers.reduce((sum, a) => sum + (a.points_awarded ?? 0), 0)
  return {
    result: { ...scored, score: sumPoints(details), details },
    scoreOverride: savedScore !== null && savedScore !== baseline ? String(savedScore) : '',
  }
}

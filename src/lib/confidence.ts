export const REVIEW_CONFIDENCE_THRESHOLD = 0.7

export function displayConfidence(d: { confidence?: number | null; student_answer: string }): number {
  return typeof d.confidence === 'number' && Number.isFinite(d.confidence)
    ? Math.max(0, Math.min(1, d.confidence)) : 0
}

export function needsTeacherReview(d: {
  confidence?: number | null
  student_answer: string | null
  needs_review?: boolean | null
  review_status?: string | null
}): boolean {
  if (d.review_status === 'accepted' || d.review_status === 'edited') return false
  return d.needs_review === true || !d.student_answer?.trim() ||
    typeof d.confidence !== 'number' || !Number.isFinite(d.confidence) ||
    d.confidence < REVIEW_CONFIDENCE_THRESHOLD
}

/**
 * Fallback confidence for display when the AI did not provide one.
 * Clear multiple-choice / true-false readings are reliable; free text is not.
 */
export function displayConfidence(d: { confidence?: number | null; student_answer: string }): number {
  if (d.confidence !== undefined && d.confidence !== null) return d.confidence
  const t = d.student_answer.trim()
  if (!t) return 0.1
  if (/^[a-e]$/i.test(t)) return 0.85
  if (/^(true|false|t|f)$/i.test(t)) return 0.85
  return 0.6
}

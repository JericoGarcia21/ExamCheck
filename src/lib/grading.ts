/**
 * Central grading rules so the same threshold is used by the results table,
 * the exports and any future view (project rule: one authoritative source).
 */
export const PASSING_PERCENTAGE = 75

export type ResultRemark = 'Not checked' | 'Needs review' | 'Passed' | 'Failed'

export function remarkFor(input: { checked: boolean; needsReview: boolean; percentage: number }): ResultRemark {
  if (!input.checked) return 'Not checked'
  if (input.needsReview) return 'Needs review'
  return input.percentage >= PASSING_PERCENTAGE ? 'Passed' : 'Failed'
}

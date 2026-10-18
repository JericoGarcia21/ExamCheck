/**
 * Central grading rules so the same threshold is used by the results table,
 * the exports and any future view (project rule: one authoritative source).
 */
export const PASSING_PERCENTAGE = 75

/** Keep full precision for grading; formatting belongs to the view/export. */
export function percentageFor(score: number, total: number): number {
  return total > 0 ? (score / total) * 100 : 0
}

export function formatPercentage(percentage: number): string {
  return `${Number(percentage.toFixed(2))}%`
}

export type ResultRemark = 'Not checked' | 'Needs review' | 'Passed' | 'Failed'

export function remarkFor(input: { checked: boolean; needsReview: boolean; percentage: number }): ResultRemark {
  if (!input.checked) return 'Not checked'
  if (input.needsReview) return 'Needs review'
  return input.percentage >= PASSING_PERCENTAGE ? 'Passed' : 'Failed'
}

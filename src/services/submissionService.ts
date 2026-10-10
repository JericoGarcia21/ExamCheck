import { supabase } from '../lib/supabase'

/**
 * Save (or overwrite) a student's result for a checking session.
 *
 * There is exactly one result per (session, student). Re-checking the same
 * student updates the existing submission and replaces its answers instead of
 * creating a duplicate row.
 */
export async function saveSubmission(input: {
  checking_session_id: string
  student_id: string
  score: number
  total_items: number
  answers: {
    question_number: number
    student_answer: string
    correct_answer: string
    is_correct: boolean
    confidence?: number | null
    review_status?: string
    points_awarded?: number
    max_points?: number
    feedback?: string | null
    needs_review?: boolean
  }[]
}): Promise<void> {
  const { error } = await supabase.rpc('save_submission_atomic', {
    p_session_id: input.checking_session_id,
    p_student_id: input.student_id,
    p_score: input.score,
    p_answers: input.answers,
  })
  if (error) throw new Error('Could not confirm the result was saved. Your answers remain here; retry to safely save the same result.')
}

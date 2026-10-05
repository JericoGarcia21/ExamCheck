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
  const { data: existing, error: findError } = await supabase
    .from('submissions')
    .select('id')
    .eq('checking_session_id', input.checking_session_id)
    .eq('student_id', input.student_id)
    .order('created_at', { ascending: false })
    .limit(1)
  if (findError) throw findError

  let submissionId: string
  if (existing && existing.length > 0) {
    submissionId = existing[0].id
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        score: input.score,
        total_items: input.total_items,
        status: 'checked',
      })
      .eq('id', submissionId)
    if (updateError) throw updateError

    // Clear previous answers so a re-check cannot leave stale rows behind.
    const { error: deleteError } = await supabase.from('answers').delete().eq('submission_id', submissionId)
    if (deleteError) throw deleteError
  } else {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        checking_session_id: input.checking_session_id,
        student_id: input.student_id,
        score: input.score,
        total_items: input.total_items,
        status: 'checked',
      })
      .select()
      .single()
    if (error) throw error
    submissionId = data.id
  }

  const rows = input.answers.map((a) => ({ ...a, submission_id: submissionId }))
  if (rows.length === 0) return
  const { error: answersError } = await supabase.from('answers').insert(rows)
  if (answersError) throw answersError
}

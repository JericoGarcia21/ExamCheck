import { supabase } from '../lib/supabase'

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
    confidence?: number
    review_status?: string
  }[]
}): Promise<void> {
  const { data: submission, error } = await supabase
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

  const rows = input.answers.map((a) => ({ ...a, submission_id: submission.id }))
  const { error: answersError } = await supabase.from('answers').insert(rows)
  if (answersError) throw answersError
}

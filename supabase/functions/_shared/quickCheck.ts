export interface QuickKey {
  question_number: number
  correct_answer: string
  question_type: 'multiple_choice' | 'true_false' | 'identification' | 'coding' | 'essay'
  max_points: number
  rubric?: string | null
}

export function validateQuickKey(value: unknown): QuickKey[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 300) throw new Error('Confirm an answer key with 1 to 300 questions.')
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid answer key.')
    const k = raw as Record<string, unknown>
    if (k.question_number !== index + 1 || typeof k.correct_answer !== 'string' || !k.correct_answer.trim() || k.correct_answer.length > 3000 ||
      !['multiple_choice','true_false','identification','coding','essay'].includes(String(k.question_type)) ||
      typeof k.max_points !== 'number' || !Number.isFinite(k.max_points) || k.max_points <= 0 || k.max_points > 100 ||
      (k.rubric != null && (typeof k.rubric !== 'string' || k.rubric.length > 3000))) throw new Error('Invalid answer key. Use sequential question numbers and 0–100 points per question.')
    if (k.question_type === 'true_false' && !/^(true|false|t|f)$/i.test(k.correct_answer.trim())) throw new Error('True/False keys must contain True, False, T, or F.')
    if (k.question_type === 'multiple_choice' && !/^[a-z]$/i.test(k.correct_answer.trim())) throw new Error('Multiple-choice keys must be a single letter.')
    return {question_number:index+1,correct_answer:k.correct_answer.trim(),question_type:k.question_type as QuickKey['question_type'],max_points:k.max_points,rubric:k.rubric as string | null | undefined}
  })
}

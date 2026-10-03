export interface ClassRow {
  id: string
  teacher_id: string
  block_name: string
  school_year: string
  created_at: string
}

export interface StudentRow {
  id: string
  class_id: string
  name: string
  sort_name: string
  student_number: string | null
  created_at: string
}

export interface SessionRow {
  id: string
  class_id: string
  session_name: string | null
  session_date: string
  status: string
  answer_key_confirmed: boolean
  created_at: string
}

export interface AnswerKeyRow {
  id: string
  checking_session_id: string
  question_number: number
  correct_answer: string
  question_type: string | null
  created_at: string
}

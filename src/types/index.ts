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
  rules: string | null
  created_at: string
}

export interface AnswerKeyRow {
  id: string
  checking_session_id: string
  question_number: number
  correct_answer: string
  question_type: string | null
  rubric: string | null
  max_points: number
  created_at: string
}

export interface SessionWithClass extends SessionRow {
  classes: { block_name: string; school_year: string } | null
}

export interface SubmissionRow {
  id: string
  checking_session_id: string
  student_id: string
  score: number | null
  total_items: number | null
  status: string
  created_at: string
}

export interface AnswerRow {
  id: string
  submission_id: string
  question_number: number
  student_answer: string | null
  correct_answer: string | null
  confidence: number | null
  is_correct: boolean | null
  review_status: string
  points_awarded: number | null
  max_points: number | null
  feedback: string | null
  needs_review: boolean
  created_at: string
}

export interface ResultRow {
  submissionId: string | null
  studentId: string
  studentName: string
  studentNumber: string | null
  score: number
  total: number
  percentage: number
  needsReview: boolean
  checked: boolean
}

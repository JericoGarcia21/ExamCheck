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

import { needsTeacherReview } from '../lib/confidence'
import { supabase } from '../lib/supabase'
import type { AnswerRow, ResultRow, SessionWithClass, SubmissionRow } from '../types'

interface RawSubmission extends SubmissionRow {
  students: { name: string; sort_name: string | null; student_number: string | null } | null
  answers: { needs_review: boolean | null; review_status: string; confidence: number | null; student_answer: string | null }[] | null
}

/** All checking sessions across a teacher's classes, newest first. */
export async function listAllSessions(): Promise<SessionWithClass[]> {
  const { data, error } = await supabase
    .from('checking_sessions')
    .select('*, classes(block_name, school_year)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SessionWithClass[]
}

/** A single session together with its class metadata. */
export async function getSessionWithClass(sessionId: string): Promise<SessionWithClass> {
  const { data, error } = await supabase
    .from('checking_sessions')
    .select('*, classes(block_name, school_year)')
    .eq('id', sessionId)
    .single()
  if (error) throw error
  return data as SessionWithClass
}

/** Every student in the class, with their submission (if checked) — alphabetical. */
export async function listSessionResults(sessionId: string): Promise<ResultRow[]> {
  // 1. Find the class for this session.
  const { data: session, error: sessionError } = await supabase
    .from('checking_sessions')
    .select('class_id')
    .eq('id', sessionId)
    .single()
  if (sessionError) throw sessionError

  // 2. Load the full roster and the recorded submissions in parallel.
  const [studentsRes, submissionsRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, sort_name, student_number')
      .eq('class_id', session.class_id),
    supabase
      .from('submissions')
      .select(
        'id, student_id, score, total_items, status, created_at, students(name, sort_name, student_number), answers(needs_review, review_status, confidence, student_answer)',
      )
      .eq('checking_session_id', sessionId),
  ])
  if (studentsRes.error) throw studentsRes.error
  if (submissionsRes.error) throw submissionsRes.error

  // 3. Index the latest submission per student.
  const rawSubmissions = (submissionsRes.data ?? []) as unknown as RawSubmission[]
  const byStudent = new Map<string, RawSubmission>()
  for (const s of rawSubmissions) {
    const existing = byStudent.get(s.student_id)
    if (!existing || (s.created_at ?? '') > (existing.created_at ?? '')) {
      byStudent.set(s.student_id, s)
    }
  }

  // 4. Merge roster + submissions so every student is listed, checked or not.
  const students = studentsRes.data ?? []
  return students
    .map((student) => {
      const sub = byStudent.get(student.id)
      const total = sub?.total_items ?? 0
      const score = sub?.score ?? 0
      return {
        submissionId: sub?.id ?? null,
        studentId: student.id,
        studentName: student.name,
        sortName: student.sort_name ?? student.name,
        studentNumber: student.student_number ?? null,
        score,
        total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        needsReview: (sub?.answers ?? []).some(needsTeacherReview),
        checked: !!sub,
      }
    })
    .sort((a, b) => a.sortName.localeCompare(b.sortName, 'en', { sensitivity: 'base' }))
    .map(({ sortName: _sortName, ...row }) => row)
}

/** The per-question answers for one student's submission. */
export async function listSubmissionAnswers(submissionId: string): Promise<AnswerRow[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('submission_id', submissionId)
    .order('question_number', { ascending: true })
  if (error) throw error
  return (data ?? []) as AnswerRow[]
}

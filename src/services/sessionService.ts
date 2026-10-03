import { supabase } from '../lib/supabase'
import type { AnswerKeyRow, SessionRow } from '../types'

export async function listSessions(classId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('checking_sessions')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getSession(id: string): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('checking_sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSession(
  classId: string,
  sessionName: string,
): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('checking_sessions')
    .insert({ class_id: classId, session_name: sessionName || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listAnswerKeys(sessionId: string): Promise<AnswerKeyRow[]> {
  const { data, error } = await supabase
    .from('answer_keys')
    .select('*')
    .eq('checking_session_id', sessionId)
    .order('question_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function saveAnswerKeys(
  sessionId: string,
  keys: { question_number: number; correct_answer: string; question_type?: string | null }[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('answer_keys')
    .delete()
    .eq('checking_session_id', sessionId)
  if (deleteError) throw deleteError

  if (keys.length === 0) return
  const rows = keys.map((k) => ({ ...k, checking_session_id: sessionId }))
  const { error } = await supabase.from('answer_keys').insert(rows)
  if (error) throw error
}

export async function confirmAnswerKey(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('checking_sessions')
    .update({ answer_key_confirmed: true, status: 'answer_key_confirmed' })
    .eq('id', sessionId)
  if (error) throw error
}

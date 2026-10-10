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

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('checking_sessions').delete().eq('id', id)
  if (error) throw error
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
  keys: {
    question_number: number
    correct_answer: string
    question_type?: string | null
    rubric?: string | null
    max_points?: number
  }[],
  confirm = false,
  rules?: string,
): Promise<void> {
  const { error } = await supabase.rpc('save_answer_key_atomic', {
    p_session_id: sessionId, p_keys: keys, p_confirm: confirm, p_rules: rules ?? null,
  })
  if (error) throw new Error('Could not confirm the answer key was saved. Reload to check its status, or retry.')
}

export async function saveRules(sessionId: string, rules: string): Promise<void> {
  const { error } = await supabase
    .from('checking_sessions')
    .update({ rules: rules.trim() || null })
    .eq('id', sessionId)
  if (error) throw error
}

import { supabase } from '../lib/supabase'
import type { StudentRow } from '../types'
import type { StudentSeed } from '../lib/students'

export async function listStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('sort_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addStudents(classId: string, seeds: StudentSeed[]): Promise<void> {
  if (seeds.length === 0) return
  const rows = seeds.map((s) => ({ ...s, class_id: classId }))
  const { error } = await supabase.from('students').insert(rows)
  if (error) throw error
}

export async function renameStudent(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ name, sort_name: name })
    .eq('id', id)
  if (error) throw error
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}

export async function deleteAllStudents(classId: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('class_id', classId)
  if (error) throw error
}

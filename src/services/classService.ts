import { supabase } from '../lib/supabase'
import type { ClassRow } from '../types'

export async function listClasses(): Promise<ClassRow[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClass(id: string): Promise<ClassRow> {
  const { data, error } = await supabase.from('classes').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createClass(input: {
  block_name: string
  school_year: string
}): Promise<ClassRow> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ block_name: input.block_name, school_year: input.school_year })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
}

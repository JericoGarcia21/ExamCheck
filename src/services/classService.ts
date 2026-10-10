import { supabase } from '../lib/supabase'
import type { ClassRow } from '../types'

export async function listClasses(archived = false): Promise<ClassRow[]> {
  let query = supabase.from('classes').select('*')
  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  const { data, error } = await query.order(archived ? 'archived_at' : 'created_at', { ascending: false })
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

export async function setClassArchived(id: string, archived: boolean): Promise<ClassRow> {
  const { data, error } = await supabase.from('classes')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

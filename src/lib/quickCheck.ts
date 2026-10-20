import { supabase } from './supabase'
import { extractFunctionError } from './readPaper'
import { validateQuickKey } from '../../supabase/functions/_shared/quickCheck'
import { validateRecognition } from '../../supabase/functions/_shared/validation'
import type { KeyRow } from './answerKey'

async function invoke(body: object) {
  const {data,error}=await supabase.functions.invoke('quick-check',{body})
  if (error) throw new Error(await extractFunctionError(error))
  if (data?.error) throw new Error(data.error)
  return data
}
export async function readQuickKey(imageBase64: string, mimeType: string): Promise<KeyRow[]> {
  const data=await invoke({mode:'key',imageBase64,mimeType})
  return validateQuickKey(data.keys)
}
export async function readQuickSheet(imageBase64: string, mimeType: string, keys: KeyRow[], rules: string) {
  const data=await invoke({mode:'sheet',imageBase64,mimeType,keys,rules})
  return validateRecognition(data,keys.map(k=>k.question_number))
}

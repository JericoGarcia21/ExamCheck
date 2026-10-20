import { supabase } from '../lib/supabase'

export interface QuickCheckSettingsValue { daily_limit: number; paused: boolean }
export async function getQuickCheckSettings(): Promise<QuickCheckSettingsValue> {
  const {data,error}=await supabase.rpc('quick_check_settings')
  if (error) throw error
  if (!data || !Number.isInteger(data.daily_limit) || data.daily_limit<0 || data.daily_limit>100 || typeof data.paused!=='boolean') throw new Error('Guest settings are unavailable.')
  return data as QuickCheckSettingsValue
}

import { supabase } from '../lib/supabase'

export interface AppAccess { admin: boolean; suspended: boolean; paused: boolean }
export interface AdminAccount { id: string; full_name: string | null; email: string | null; created_at: string; is_admin: boolean; suspended: boolean }
export interface AdminAnalytics { accounts: number; suspended: number; classes: number; sessions: number; papers: number; requests: number; daily: { day: string; requests: number }[] }

async function rpc<T>(name: string, args = {}): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data as T
}
export const getAppAccess = () => rpc<AppAccess>('app_access')
export const getAdminAnalytics = () => rpc<AdminAnalytics>('admin_analytics')
export const getAdminAccounts = (search: string, offset: number) => rpc<AdminAccount[]>('admin_accounts', { p_search: search, p_offset: offset })
export const setAccountSuspended = (id: string, suspended: boolean) => rpc<void>('admin_set_suspended', { p_user_id: id, p_suspended: suspended })
export const setAppPaused = (paused: boolean) => rpc<void>('admin_set_paused', { p_paused: paused })

export interface ModelUsageRow {
  source: 'signed_in'|'guest_key'|'guest_sheet'; model:string; attempts:number; reported_attempts:number; failed_attempts:number;
  input_tokens:number|null;output_tokens:number|null;thinking_tokens:number|null;cached_tokens:number|null;total_tokens:number|null;last_recorded:string
}
export interface ModelUsageAnalytics {
  daily_limit:number;global_limit:number;guest_today:number;guest_30_days:number;tracking_since:string|null;
  models:ModelUsageRow[];daily:{day:string;guest_scans:number}[]
}
export const getModelUsage = () => rpc<ModelUsageAnalytics>('admin_model_usage')
export const setGuestGlobalLimit = (limit:number) => rpc<void>('admin_set_quick_check_global_limit',{p_limit:limit})

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

const hasEnv = Boolean(supabaseUrl && supabasePublishableKey)

if (!hasEnv) {
  console.error(
    'Supabase env vars missing or using old names. In .env set:\n' +
      'VITE_SUPABASE_URL=...\n' +
      'VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...\n' +
      'Then restart the dev server.',
  )
}

export const supabase = createClient(
  hasEnv ? supabaseUrl! : 'http://127.0.0.1:54321',
  hasEnv ? supabasePublishableKey! : 'missing-publishable-key',
)

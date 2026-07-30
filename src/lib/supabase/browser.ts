import { getPublicSupabaseConfig } from './env'
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

export function createBrowserClient() {
  const { url, anonKey } = getPublicSupabaseConfig()
  return createSupabaseBrowserClient(url, anonKey)
}

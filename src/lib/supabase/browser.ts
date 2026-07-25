import { getPublicSupabaseConfig } from './env'

export async function createBrowserClient() {
  const { url, anonKey } = getPublicSupabaseConfig()
  const ssr = await import('@supabase/ssr')
  if (typeof ssr.createBrowserClient !== 'function') {
    throw new Error('Expected createBrowserClient in @supabase/ssr')
  }
  return ssr.createBrowserClient(url, anonKey)
}

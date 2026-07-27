import { createServerClient } from './server'
import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

export async function refreshSession(req: NextRequest | Request, res: NextResponse) {
  const client = await createServerClient(req as any, res as any)

  // Attempt to get current user
  let user = null
  try {
    const u = await client.auth.getUser()
    user = u?.data?.user || null
  } catch (e) {
    user = null
  }

  // If user present, fetch profile row from public.profiles
  let profile = null
  if (user) {
    try {
      const p = await client.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
      profile = p?.data || null
    } catch (e) {
      profile = null
    }
  }

  return { user, profile }
}

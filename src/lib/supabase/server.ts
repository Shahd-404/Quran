import { getPublicSupabaseConfig } from './env'
import { NextRequest, NextResponse } from 'next/server'

type SupabaseLike = any

export async function createServerClient(req: NextRequest | Request, res: NextResponse) : Promise<SupabaseLike> {
  const { url, anonKey } = getPublicSupabaseConfig()
  const ssr = await import('@supabase/ssr')
  if (typeof ssr.createServerClient !== 'function') {
    throw new Error('Expected createServerClient in @supabase/ssr')
  }

  // Adapter for cookie getAll/setAll expected by @supabase/ssr
  const getAll = () => {
    try {
      // NextRequest cookies has getAll()
      // @ts-ignore
      if ((req as NextRequest).cookies && typeof (req as NextRequest).cookies.getAll === 'function') {
        // @ts-ignore
        return (req as NextRequest).cookies.getAll().map((c: any) => `${c.name}=${c.value}`)
      }
    } catch (e) {}
    const header = (req as Request).headers?.get?.('cookie') || ''
    if (!header) return []
    return header.split(';').map(s => s.trim())
  }

  const setAll = (cookies: string[]) => {
    // Set 'set-cookie' header(s) on the response
    for (const c of cookies) {
      res.headers.append('set-cookie', c)
    }
  }

  return ssr.createServerClient(url, anonKey, { cookies: { getAll, setAll } as any })
}


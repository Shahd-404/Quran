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
  const getAll = async () => {
    try {
      // NextRequest cookies has getAll()
      // @ts-ignore
      if ((req as NextRequest).cookies && typeof (req as NextRequest).cookies.getAll === 'function') {
        // @ts-ignore
        return (req as NextRequest).cookies.getAll().map((c: any) => ({ name: c.name, value: c.value }))
      }
    } catch (e) {}

    const header = (req as Request).headers?.get?.('cookie') || ''
    if (!header) return []
    return header
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(cookie => {
        const [name, ...rest] = cookie.split('=')
        return { name: name.trim(), value: rest.join('=').trim() }
      })
  }

  const setAll = async (cookies: Array<{ name: string; value: string; options?: any }>) => {
    for (const c of cookies) {
      const headerValue = c.options
        ? require('cookie').serialize(c.name, c.value, c.options)
        : `${c.name}=${c.value}`
      res.headers.append('set-cookie', headerValue)
    }
  }

  return ssr.createServerClient(url, anonKey, { cookies: { getAll, setAll } as any })
}


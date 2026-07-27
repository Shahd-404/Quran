import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'

export async function POST(req: Request) {
  const rejected = mutationGuardResponse(req)
  if (rejected) return rejected
  try {
    const res = NextResponse.redirect(new URL('/login', req.url))
    const client = await createServerClient(req as any, res as any)
    await client.auth.signOut()

    // Ensure known Supabase auth cookies are removed on logout.
    res.cookies.delete('sb-access-token')
    res.cookies.delete('sb-refresh-token')
    res.cookies.delete('supabase-auth-token')
    res.cookies.delete('sb-auth-token')

    return res
  } catch (err) {
    return NextResponse.json({ message: 'فشل تسجيل الخروج' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/server'

export async function POST(req: Request) {
  try {
    const res = NextResponse.redirect(new URL('/login', req.url))
    const client = await createServerClient(req as any, res as any)
    await client.auth.signOut()
    return res
  } catch (err) {
    return NextResponse.json({ message: 'فشل تسجيل الخروج' }, { status: 500 })
  }
}

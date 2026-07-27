import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'

export async function POST(req: Request) {
  const rejected = mutationGuardResponse(req, { requireJson: true, maxBytes: 8192 })
  if (rejected) return rejected
  const body = await req.json().catch(()=>null)
  const email = body?.email?.toString()?.trim() || ''
  const password = body?.password || ''
  const display_name = body?.display_name?.toString()?.trim() || null

  if (!email || !password) {
    return NextResponse.json({ message: 'يرجى تقديم البريد الإلكتروني وكلمة المرور' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 })
  }

  try {
    const res = NextResponse.json({ ok: true })
    const client = await createServerClient(req as any, res as any)

    const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Africa/Cairo'
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name, timezone, locale: 'ar' } } })
    if (error) {
      return NextResponse.json({ message: translateRegisterError(error.message) }, { status: 400 })
    }

    const requiresVerification = !data?.session
    if (requiresVerification) {
      return NextResponse.json({ ok: true, requiresVerification: true })
    }

    return res
  } catch (err) {
    return NextResponse.json({ message: 'حدث خطأ أثناء محاولة التسجيل' }, { status: 500 })
  }
}

function translateRegisterError(message: string) {
  if (!message) return 'فشل التسجيل'
  const m = message.toLowerCase()
  if (m.includes('already')) return 'الحساب موجود بالفعل'
  if (m.includes('invalid')) return 'البريد الإلكتروني غير صالح'
  return 'فشل التسجيل'
}

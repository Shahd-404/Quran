import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.json().catch(()=>null)
  const email = body?.email?.toString()?.trim() || ''
  const password = body?.password || ''

  if (!email || !password) {
    return NextResponse.json({ message: 'يرجى تقديم البريد الإلكتروني وكلمة المرور' }, { status: 400 })
  }

  try {
    const res = NextResponse.next()
    const client = await createServerClient(req as any, res as any)
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ message: translateAuthError(error.message) }, { status: 400 })
    }

    // If Supabase set cookies via the helper, the response will include them.
    // Redirect to /app when signed in.
    return NextResponse.redirect(new URL('/app', req.url))
  } catch (err: any) {
    return NextResponse.json({ message: 'حدث خطأ أثناء محاولة تسجيل الدخول' }, { status: 500 })
  }
}

function translateAuthError(message: string) {
  if (!message) return 'فشل المصادقة'
  const m = message.toLowerCase()
  if (m.includes('invalid')) return 'بيانات الاعتماد غير صحيحة'
  if (m.includes('password')) return 'كلمة المرور غير صحيحة'
  if (m.includes('not confirmed') || m.includes('verification')) return 'يرجى تأكيد بريدك الإلكتروني قبل المتابعة'
  return 'فشل المصادقة'
}

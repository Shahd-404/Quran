import { NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'
import {
  getEmailRedirectTo,
  isExistingAccountError,
  mapAuthFailure,
} from '../registration'

type RegisterSuccess = {
  ok: true
  requiresEmailConfirmation: boolean
}

type RegisterFailure = {
  ok: false
  code: string
  message: string
}

export async function POST(req: Request) {
  const rejected = mutationGuardResponse(req, { requireJson: true, maxBytes: 8192 })
  if (rejected) return rejected

  const body = await req.json().catch(()=>null)
  const email =
    body && typeof body.email === 'string' ? body.email.trim() : ''
  const password =
    body && typeof body.password === 'string' ? body.password : ''
  const displayName =
    body && typeof body.display_name === 'string'
      ? body.display_name.trim() || null
      : null

  if (!email || !password) {
    return NextResponse.json<RegisterFailure>(
      {
        ok: false,
        code: 'validation_failed',
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
      },
      { status: 400 },
    )
  }
  if (password.length < 8) {
    return NextResponse.json<RegisterFailure>(
      {
        ok: false,
        code: 'weak_password',
        message: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
      },
      { status: 400 },
    )
  }

  const emailRedirectTo = getEmailRedirectTo()
  if (!emailRedirectTo) {
    return NextResponse.json<RegisterFailure>(
      {
        ok: false,
        code: 'invalid_redirect_url',
        message: 'تعذر بدء إنشاء الحساب الآن. حاولي مرة أخرى لاحقًا.',
      },
      { status: 500 },
    )
  }

  try {
    const immediateSessionResponse = NextResponse.json<RegisterSuccess>(
      { ok: true, requiresEmailConfirmation: false },
      { status: 201 },
    )
    const client = await createServerClient(req, immediateSessionResponse)

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo,
      },
    })

    if (error) {
      if (isExistingAccountError(error)) {
        return NextResponse.json<RegisterSuccess>(
          { ok: true, requiresEmailConfirmation: true },
          { status: 200 },
        )
      }

      const failure = mapAuthFailure(error)
      return NextResponse.json<RegisterFailure>(
        { ok: false, code: failure.code, message: failure.message },
        { status: failure.status },
      )
    }

    if (!data?.user) {
      const failure = mapAuthFailure(null)
      return NextResponse.json<RegisterFailure>(
        { ok: false, code: failure.code, message: failure.message },
        { status: failure.status },
      )
    }

    if (!data.session) {
      return NextResponse.json<RegisterSuccess>(
        { ok: true, requiresEmailConfirmation: true },
        { status: 201 },
      )
    }

    return immediateSessionResponse
  } catch {
    return NextResponse.json<RegisterFailure>(
      {
        ok: false,
        code: 'unexpected_failure',
        message: 'تعذر إنشاء الحساب الآن. حاولي مرة أخرى لاحقًا.',
      },
      { status: 500 },
    )
  }
}

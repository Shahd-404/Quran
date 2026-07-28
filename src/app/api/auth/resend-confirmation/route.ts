import { NextResponse } from 'next/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'
import { createServerClient } from '@/lib/supabase/server'
import {
  getEmailRedirectTo,
  isPrivateResendError,
  mapAuthFailure,
} from '../registration'

type ResendSuccess = {
  ok: true
}

type ResendFailure = {
  ok: false
  code: string
  message: string
}

export async function POST(req: Request) {
  const rejected = mutationGuardResponse(req, {
    requireJson: true,
    maxBytes: 4096,
  })
  if (rejected) return rejected

  const body = await req.json().catch(() => null)
  const email =
    body && typeof body.email === 'string' ? body.email.trim() : ''

  if (!email) {
    return NextResponse.json<ResendFailure>(
      {
        ok: false,
        code: 'validation_failed',
        message: 'يرجى إدخال البريد الإلكتروني.',
      },
      { status: 400 },
    )
  }

  const emailRedirectTo = getEmailRedirectTo()
  if (!emailRedirectTo) {
    return NextResponse.json<ResendFailure>(
      {
        ok: false,
        code: 'invalid_redirect_url',
        message: 'تعذر إرسال رسالة التأكيد الآن. حاولي مرة أخرى لاحقًا.',
      },
      { status: 500 },
    )
  }

  try {
    const response = NextResponse.json<ResendSuccess>({ ok: true })
    const client = await createServerClient(req, response)
    const { error } = await client.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    })

    if (!error || isPrivateResendError(error)) return response

    const failure = mapAuthFailure(error)
    return NextResponse.json<ResendFailure>(
      { ok: false, code: failure.code, message: failure.message },
      { status: failure.status },
    )
  } catch {
    return NextResponse.json<ResendFailure>(
      {
        ok: false,
        code: 'unexpected_failure',
        message: 'تعذر إرسال رسالة التأكيد الآن. حاولي مرة أخرى لاحقًا.',
      },
      { status: 500 },
    )
  }
}

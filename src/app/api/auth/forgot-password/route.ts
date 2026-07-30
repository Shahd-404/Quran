import { NextResponse } from 'next/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'
import { createServerClient } from '@/lib/supabase/server'
import {
  getPasswordRecoveryRedirectTo,
  isPrivateRecoveryLookupError,
  isValidRecoveryEmail,
  mapPasswordRecoveryFailure,
  PASSWORD_RECOVERY_GENERIC_MESSAGE,
  PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
} from '@/modules/auth/password-recovery'

type ForgotPasswordSuccess = {
  ok: true
  message: string
}

type ForgotPasswordFailure = {
  ok: false
  code: 'invalid_email' | 'invalid_redirect_url' | 'rate_limited' | 'unexpected_failure'
  message: string
}

export async function POST(request: Request) {
  const rejected = mutationGuardResponse(request, {
    requireJson: true,
    maxBytes: 4096,
  })
  if (rejected) return rejected

  const body = await request.json().catch(() => null)
  const email =
    body && typeof body.email === 'string' ? body.email.trim() : ''

  if (!isValidRecoveryEmail(email)) {
    return NextResponse.json<ForgotPasswordFailure>(
      {
        ok: false,
        code: 'invalid_email',
        message: 'أدخلي عنوان بريد إلكتروني صالحًا.',
      },
      { status: 400 },
    )
  }

  const redirectTo = getPasswordRecoveryRedirectTo()
  if (!redirectTo) {
    return NextResponse.json<ForgotPasswordFailure>(
      {
        ok: false,
        code: 'invalid_redirect_url',
        message: PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
      },
      { status: 500 },
    )
  }

  try {
    const successResponse = NextResponse.json<ForgotPasswordSuccess>({
      ok: true,
      message: PASSWORD_RECOVERY_GENERIC_MESSAGE,
    })
    const client = await createServerClient(request, successResponse)
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (!error || isPrivateRecoveryLookupError(error)) {
      return successResponse
    }

    const failure = mapPasswordRecoveryFailure(error)
    return NextResponse.json<ForgotPasswordFailure>(
      {
        ok: false,
        code: failure.code,
        message: failure.message,
      },
      { status: failure.status },
    )
  } catch {
    return NextResponse.json<ForgotPasswordFailure>(
      {
        ok: false,
        code: 'unexpected_failure',
        message: PASSWORD_RECOVERY_UNEXPECTED_MESSAGE,
      },
      { status: 500 },
    )
  }
}

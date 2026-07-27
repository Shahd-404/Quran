import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { startNewKhatma } from '@/modules/khatma/server/start-new-khatma'
import { StartNewKhatmaErrorCode } from '@/modules/khatma/server/types'
import { mutationGuardResponse } from '@/lib/security/request-guards'

function responseStatus(code: StartNewKhatmaErrorCode): number {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401
    case 'COMPLETED_PLAN_NOT_FOUND':
    case 'COMPLETED_KHATMA_NOT_FOUND':
      return 404
    case 'INVALID_EFFECTIVE_DATE':
      return 400
    case 'INTERNAL_ERROR':
      return 500
    default:
      return 409
  }
}

export async function POST(request: Request) {
  const rejected = mutationGuardResponse(request, { requireJson: true, maxBytes: 2048 })
  if (rejected) return rejected
  try {
    const body: unknown = await request.json()
    const effectiveFrom =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as Record<string, unknown>).effectiveFrom === 'string'
        ? String((body as Record<string, unknown>).effectiveFrom)
        : ''

    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const result = await startNewKhatma(client, effectiveFrom)

    if (!result.success) {
      return NextResponse.json(result, {
        status: responseStatus(result.code),
      })
    }

    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'تعذّر بدء الختمة الجديدة الآن. حاول مرة أخرى بعد قليل.',
      },
      { status: 500 },
    )
  }
}

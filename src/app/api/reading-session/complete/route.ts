import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { completeReadingSession } from '@/modules/session-completion/server/complete-reading-session'
import { SessionCompletionErrorCode } from '@/modules/session-completion/server/types'
import { mutationGuardResponse } from '@/lib/security/request-guards'

function responseStatus(code: SessionCompletionErrorCode): number {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401
    case 'OFFLINE_ACTION_INVALID':
      return 400
    case 'SESSION_NOT_FOUND':
      return 404
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
    const sessionId =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as Record<string, unknown>).sessionId === 'string'
        ? String((body as Record<string, unknown>).sessionId)
        : ''
    const offlineValue =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>).offlineAction
        : undefined
    let offlineAction: { idempotencyKey: string; occurredAt: string } | undefined
    if (offlineValue !== undefined) {
      if (
        typeof offlineValue !== 'object' ||
        offlineValue === null ||
        typeof (offlineValue as Record<string, unknown>).idempotencyKey !== 'string' ||
        typeof (offlineValue as Record<string, unknown>).occurredAt !== 'string'
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'OFFLINE_ACTION_INVALID',
            message: 'تعذّر التحقق من إجراء الإكمال المحفوظ. أعد فتح الجلسة وحاول مرة أخرى.',
          },
          { status: 400 },
        )
      }
      offlineAction = {
        idempotencyKey: String((offlineValue as Record<string, unknown>).idempotencyKey),
        occurredAt: String((offlineValue as Record<string, unknown>).occurredAt),
      }
    }

    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const result = await completeReadingSession(client, sessionId, offlineAction)

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
        message:
          'تعذّر تسجيل إكمال الجلسة الآن. حاول مرة أخرى بعد قليل.',
      },
      { status: 500 },
    )
  }
}

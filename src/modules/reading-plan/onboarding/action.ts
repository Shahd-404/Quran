import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createReadingPlan } from '@/modules/reading-plan/server/create-reading-plan'
import { CreatePlanInput } from '@/modules/reading-plan/server/types'

function buildPlanInput(body: any): CreatePlanInput {
  const sessions = Array.isArray(body?.sessions)
    ? body.sessions.map((session: any, index: number) => ({
        sessionOrder: Number(session?.sessionOrder ?? index + 1),
        scheduledTime: String(session?.scheduledTime ?? '').trim(),
      }))
    : []

  return {
    startPage: Number(body?.startPage),
    dailyPages: Number(body?.dailyPages),
    sessions,
    timezone: String(body?.timezone ?? '').trim(),
    effectiveFrom: String(body?.effectiveFrom ?? '').trim(),
  }
}

function responseStatus(code: string) {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401
    case 'ACTIVE_PLAN_EXISTS':
      return 409
    case 'INTERNAL_ERROR':
      return 500
    default:
      return 400
  }
}

export async function createReadingPlanApi(req: Request) {
  try {
    let body
    try {
      body = await req.json()
    } catch (_parseErr) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT', message: 'مدخلات غير صالحة' },
        { status: 400 }
      )
    }

    if (!body) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT', message: 'مدخلات غير صالحة' },
        { status: 400 }
      )
    }

    const input = buildPlanInput(body)

    const res = new Response()
    const client = await createServerClient(req as any, res as any)
    const result = await createReadingPlan(client, input)

    if (result.success) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: responseStatus(result.code) }
    )
  } catch (error: any) {
    console.error('[createReadingPlanApi] Unhandled error:', error)
    return NextResponse.json(
      { ok: false, code: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي. حاول مرة أخرى.' },
      { status: 500 }
    )
  }
}

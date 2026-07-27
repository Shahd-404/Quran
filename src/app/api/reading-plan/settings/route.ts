import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { updatePlanSettings } from '@/modules/reading-plan/settings/server/update-plan-settings'
import {
  PlanSettingsSchedule,
  UpdatePlanSettingsErrorCode,
} from '@/modules/reading-plan/settings/server/types'
import { mutationGuardResponse } from '@/lib/security/request-guards'

function responseStatus(code: UpdatePlanSettingsErrorCode): number {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401
    case 'ACTIVE_PLAN_NOT_FOUND':
      return 404
    case 'PLAN_UPDATE_CONFLICT':
      return 409
    case 'INTERNAL_ERROR':
      return 500
    default:
      return 400
  }
}

function parseSchedules(value: unknown): PlanSettingsSchedule[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const record =
      typeof item === 'object' && item !== null
        ? (item as Record<string, unknown>)
        : {}
    return {
      sessionOrder: Number(record.sessionOrder ?? index + 1),
      scheduledTime:
        typeof record.scheduledTime === 'string'
          ? record.scheduledTime.trim()
          : '',
    }
  })
}

export async function POST(request: Request) {
  const rejected = mutationGuardResponse(request, { requireJson: true, maxBytes: 8192 })
  if (rejected) return rejected
  try {
    const body: unknown = await request.json()
    const record =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {}
    const input = {
      dailyPages: Number(record.dailyPages),
      sessions: parseSchedules(record.sessions),
    }

    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const result = await updatePlanSettings(client, input)

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
        message: 'تعذّر حفظ تعديلات الخطة الآن. حاول مرة أخرى بعد قليل.',
      },
      { status: 500 },
    )
  }
}

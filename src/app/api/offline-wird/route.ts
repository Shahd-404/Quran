import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'
import {
  createOfflineDownloadBundle,
  getOfflineAccountScope,
  getOfflineDownloadManifest,
} from '@/modules/offline/server/offline-download'
import type { OfflineApiFailureCode } from '@/modules/offline/types'

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
}

function failureStatus(code: OfflineApiFailureCode): number {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 401
    case 'INVALID_REQUEST':
      return 400
    case 'NO_ACTIVE_PLAN':
    case 'SESSION_NOT_ELIGIBLE':
      return 409
    case 'DOWNLOAD_TOO_LARGE':
      return 413
    case 'RATE_LIMITED':
      return 429
    case 'CONTENT_UNAVAILABLE':
      return 503
    default:
      return 500
  }
}

function json(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status, headers: PRIVATE_HEADERS })
  if (status === 429) response.headers.set('Retry-After', '900')
  return response
}

export async function GET(request: Request) {
  try {
    const includeNextDays = new URL(request.url).searchParams.get('days') === '7'
    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const scopeOnly = new URL(request.url).searchParams.get('scope') === '1'
    const result = scopeOnly
      ? await getOfflineAccountScope(client)
      : await getOfflineDownloadManifest(client, includeNextDays)
    return json(result, result.success ? 200 : failureStatus(result.code))
  } catch {
    return json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'تعذّر تجهيز قائمة التنزيل الآن. حاول مرة أخرى بعد قليل.',
      },
      500,
    )
  }
}

export async function POST(request: Request) {
  const rejected = mutationGuardResponse(request, {
    requireJson: true,
    maxBytes: 8192,
  })
  if (rejected) return rejected

  try {
    const body: unknown = await request.json()
    const sessionIdsValue: unknown =
      typeof body === 'object' &&
      body !== null &&
      Array.isArray((body as Record<string, unknown>).sessionIds)
        ? (body as Record<string, unknown>).sessionIds
        : []
    if (!Array.isArray(sessionIdsValue)) {
      return json(
        {
          success: false,
          code: 'INVALID_REQUEST',
          message: 'تعذّر بدء التنزيل لأن الطلب غير صالح.',
        },
        400,
      )
    }
    const normalized = sessionIdsValue.filter(
      (value): value is string => typeof value === 'string',
    )
    if (normalized.length !== sessionIdsValue.length) {
      return json(
        {
          success: false,
          code: 'INVALID_REQUEST',
          message: 'تعذّر بدء التنزيل لأن الطلب غير صالح.',
        },
        400,
      )
    }

    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const result = await createOfflineDownloadBundle(client, normalized)
    return json(result, result.success ? 200 : failureStatus(result.code))
  } catch {
    return json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'تعذّر تجهيز التنزيل الآن. حاول مرة أخرى بعد قليل.',
      },
      500,
    )
  }
}

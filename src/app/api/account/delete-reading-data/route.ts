import { NextResponse } from 'next/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'
import { createServerClient } from '@/lib/supabase/server'
import { deleteReadingData } from '@/modules/account/server/delete-reading-data'

export async function POST(request: Request) {
  const rejected = mutationGuardResponse(request, { requireJson: true, maxBytes: 512 })
  if (rejected) return rejected

  try {
    const body: unknown = await request.json()
    const confirmation =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as Record<string, unknown>).confirmation === 'string'
        ? String((body as Record<string, unknown>).confirmation)
        : ''

    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const result = await deleteReadingData(client, confirmation)
    if (!result.success) {
      const status =
        result.code === 'UNAUTHENTICATED'
          ? 401
          : result.code === 'INVALID_CONFIRMATION'
            ? 400
            : 500
      return NextResponse.json(result, { status })
    }
    return NextResponse.json({
      success: true,
      code: 'READING_DATA_DELETED',
      deleted: result.deleted,
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'تعذر مسح بيانات القراءة الآن. حاول مرة أخرى لاحقًا.',
      },
      { status: 500 },
    )
  }
}

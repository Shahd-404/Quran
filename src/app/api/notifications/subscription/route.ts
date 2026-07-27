import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { mutationGuardResponse } from '@/lib/security/request-guards'

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null
}

export async function POST(request: Request) {
  const rejected = mutationGuardResponse(request, { requireJson: true, maxBytes: 8192 })
  if (rejected) return rejected
  try {
    const body = await request.json() as Record<string, unknown>
    const keys = typeof body.keys === 'object' && body.keys ? body.keys as Record<string, unknown> : {}
    const endpoint = text(body.endpoint, 2048)
    const p256dh = text(keys.p256dh, 512)
    const auth = text(keys.auth, 256)
    if (!endpoint || !p256dh || !auth || !endpoint.startsWith('https://')) {
      return NextResponse.json({ code: 'INVALID_SUBSCRIPTION' }, { status: 400 })
    }
    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const { data: userData } = await client.auth.getUser()
    if (!userData?.user) return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 })
    const { error } = await client.rpc('save_push_subscription', {
      p_endpoint: endpoint, p_p256dh_key: p256dh, p_auth_key: auth,
      p_user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
    })
    if (error) return NextResponse.json({ code: 'SUBSCRIPTION_SAVE_FAILED' }, { status: 500 })
    return NextResponse.json({ ok: true, code: 'SUBSCRIPTION_SAVED' })
  } catch {
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const rejected = mutationGuardResponse(request, { requireJson: true, maxBytes: 4096 })
  if (rejected) return rejected
  try {
    const body = await request.json() as Record<string, unknown>
    const endpoint = text(body.endpoint, 2048)
    if (!endpoint) return NextResponse.json({ code: 'INVALID_SUBSCRIPTION' }, { status: 400 })
    const response = new NextResponse()
    const client = await createServerClient(request, response)
    const { data: userData } = await client.auth.getUser()
    if (!userData?.user) return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 })
    const { error } = await client.rpc('remove_push_subscription', { p_endpoint: endpoint })
    if (error) return NextResponse.json({ code: 'SUBSCRIPTION_REMOVE_FAILED' }, { status: 500 })
    return NextResponse.json({ ok: true, code: 'SUBSCRIPTION_REMOVED' })
  } catch {
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

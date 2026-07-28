import { createClient } from 'npm:@supabase/supabase-js@2.32.0'
import webpush from 'npm:web-push@3.6.7'
import {
  hasValidInvocationToken,
  REMINDER_INVOCATION_HEADER,
} from './invocation-auth.ts'

type Claim = {
  delivery_id: string
  subscription_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  reading_session_id: string
}

const jsonHeaders = { 'Content-Type': 'application/json' }

function response(body: Record<string, number | string>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

Deno.serve(async (request) => {
  const invocationToken = Deno.env.get('REMINDER_INVOCATION_SECRET')
  if (
    !hasValidInvocationToken(
      request.headers.get(REMINDER_INVOCATION_HEADER),
      invocationToken,
    )
  ) {
    return response({ error: 'UNAUTHORIZED' }, 401)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) {
    return response({ error: 'CONFIGURATION_ERROR' }, 500)
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data, error } = await supabase.rpc('claim_due_reading_reminders', { p_batch_size: 100 })
  if (error) {
    console.error('[claim_due_reading_reminders]', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return response({ error: 'CLAIM_FAILED' }, 500)
  }

  const counts = { claimed: 0, sent: 0, failed: 0, skipped: 0 }
  for (const claim of (data ?? []) as Claim[]) {
    counts.claimed++
    try {
      await webpush.sendNotification(
        { endpoint: claim.endpoint, keys: { p256dh: claim.p256dh_key, auth: claim.auth_key } },
        JSON.stringify({
          kind: 'session_due',
          title: 'حان وقت وردك',
          body: 'جلسة الورد جاهزة للقراءة.',
          url: `/app/read/${claim.reading_session_id}`,
          tag: `reading-session-${claim.reading_session_id}`,
        }),
        { TTL: 1800 },
      )
      await supabase.rpc('finish_notification_delivery', {
        p_delivery_id: claim.delivery_id, p_status: 'sent',
        p_error_code: null, p_deactivate_subscription: false,
      })
      counts.sent++
    } catch (cause) {
      const statusCode = typeof cause === 'object' && cause !== null && 'statusCode' in cause
        ? Number((cause as { statusCode?: unknown }).statusCode) : 0
      const permanent = statusCode === 404 || statusCode === 410
      await supabase.rpc('finish_notification_delivery', {
        p_delivery_id: claim.delivery_id,
        p_status: permanent ? 'skipped' : 'failed',
        p_error_code: permanent ? 'SUBSCRIPTION_EXPIRED' : 'PUSH_TRANSIENT_FAILURE',
        p_deactivate_subscription: permanent,
      })
      if (permanent) counts.skipped++; else counts.failed++
    }
  }
  return response(counts)
})

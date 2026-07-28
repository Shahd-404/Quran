import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'functions',
    'send-due-reading-reminders',
    'index.ts',
  ),
  'utf8',
)

describe('send-due-reading-reminders source contract', () => {
  it('keeps aggregate-only response counters', () => {
    expect(source).toContain(
      "const counts = { claimed: 0, sent: 0, failed: 0, skipped: 0 }",
    )
    expect(source).toContain('return response(counts)')
  })

  it('preserves the claim and finish RPC calls', () => {
    expect(source).toContain(
      "supabaseAdmin.rpc('claim_due_reading_reminders', { p_batch_size: 100 })",
    )
    expect(source).toContain("supabaseAdmin.rpc('finish_notification_delivery'")
  })

  it('temporarily logs only the protected RPC diagnostic fields', () => {
    expect(source).toContain("Deno.env.get('REMINDER_INVOCATION_SECRET')")
    expect(source).not.toContain("request.headers.get('authorization')")
    expect(source.match(/console\.error/g)).toHaveLength(1)
    expect(source).toContain("console.error('[reminder_rpc_error]'")
    expect(source).toContain("operation: 'claim_due_reading_reminders'")
    expect(source).toContain('code: error.code')
    expect(source).toContain('message: error.message')
    expect(source).toContain('details: error.details')
    expect(source).toContain('hint: error.hint')
    expect(source).not.toMatch(/console\.(log|warn)/)
  })
})

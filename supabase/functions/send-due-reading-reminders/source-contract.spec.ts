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
      "supabase.rpc('claim_due_reading_reminders', { p_batch_size: 100 })",
    )
    expect(source).toContain("supabase.rpc('finish_notification_delivery'")
  })

  it('uses the dedicated secret and never logs request authentication values', () => {
    expect(source).toContain("Deno.env.get('REMINDER_INVOCATION_SECRET')")
    expect(source).not.toMatch(/console\.(log|warn|error)/)
    expect(source).not.toContain("request.headers.get('authorization')")
  })
})

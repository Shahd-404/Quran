import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const databaseSource = fs.readFileSync(
  'src/modules/offline/client/offline-db.ts',
  'utf8',
)
const rateMigration = fs.readFileSync(
  'supabase/migrations/20260804100000_rate_limit_offline_quran_downloads.sql',
  'utf8',
)
const receiptMigration = fs.readFileSync(
  'supabase/migrations/20260804101000_idempotent_offline_completion.sql',
  'utf8',
)
const quranPageSource = fs.readFileSync(
  'src/modules/quran/server/get-page.ts',
  'utf8',
)

describe('offline persistence contracts', () => {
  it('creates the four versioned stores and commits pages, sessions, and metadata together', () => {
    expect(databaseSource).toContain("export const OFFLINE_DB_VERSION = 1")
    expect(databaseSource).toContain("sessions: 'downloaded_sessions'")
    expect(databaseSource).toContain("pages: 'downloaded_quran_pages'")
    expect(databaseSource).toContain("outbox: 'offline_progress_outbox'")
    expect(databaseSource).toContain("metadata: 'offline_metadata'")
    expect(databaseSource).toContain(
      '[OFFLINE_STORES.sessions, OFFLINE_STORES.pages, OFFLINE_STORES.metadata]',
    )
  })

  it('keeps rate-limit and idempotency tables private behind authenticated functions', () => {
    expect(rateMigration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(rateMigration).toContain('REVOKE ALL ON TABLE public.offline_download_rate_limits')
    expect(rateMigration).toContain('GRANT EXECUTE ON FUNCTION public.reserve_offline_quran_download() TO authenticated')
    expect(receiptMigration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(receiptMigration).toContain('REVOKE ALL ON TABLE public.offline_completion_receipts')
    expect(receiptMigration).toContain('complete_offline_reading_session')
  })

  it('bounds both browser and in-process Quran content retention to seven days', () => {
    expect(databaseSource).toContain('OFFLINE_RETENTION_MS')
    expect(quranPageSource).toContain('const QURAN_PAGE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000')
    expect(quranPageSource).toContain('cached.expiresAt > Date.now()')
  })
})

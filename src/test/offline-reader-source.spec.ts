import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const reader = fs.readFileSync('public/offline-reader.js', 'utf8')
const offlineDocument = fs.readFileSync('public/offline.html', 'utf8')

describe('offline reader shell', () => {
  it('uses the required account-scoped IndexedDB stores and never embeds credentials', () => {
    for (const store of [
      'downloaded_sessions',
      'downloaded_quran_pages',
      'offline_progress_outbox',
      'offline_metadata',
    ]) {
      expect(reader).toContain(store)
    }
    expect(reader).not.toMatch(/access[_-]?token|refresh[_-]?token|client[_-]?secret/i)
  })

  it('fails closed for missing, expired, or incomplete exact page ranges', () => {
    expect(reader).toContain("return { state: 'missing' }")
    expect(reader).toContain("return { state: 'expired' }")
    expect(reader).toContain("return { state: 'incomplete' }")
    expect(reader).toContain('for (let pageNumber = session.startPage; pageNumber <= session.endPage')
    expect(reader).toContain('لا يمكن عرض جزء من الجلسة')
  })

  it('queues explicit completion without claiming server progress', () => {
    expect(reader).toContain("status: 'pending'")
    expect(reader).toContain('actionId: crypto.randomUUID()')
    expect(reader).toContain('لم يُسجّل على الخادم بعد')
    expect(offlineDocument).toContain('/offline-reader.js')
  })
})

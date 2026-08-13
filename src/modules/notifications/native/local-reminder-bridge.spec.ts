import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('native local reminder bridge source contract', () => {
  beforeEach(() => { vi.resetModules(); Object.defineProperty(globalThis.crypto, 'randomUUID', { value: () => '123e4567-e89b-42d3-a456-426614174000', configurable: true }) })
  it('rejects invalid routes before sending', async () => {
    const bridge = await import('./local-reminder-bridge')
    expect(await bridge.syncNativeReminders([{ readingSessionId:'123e4567-e89b-42d3-a456-426614174000',scheduledAtEpochMs:Date.now()+60000,startPage:1,endPage:2,path:'/evil' }])).toBe('invalid_payload')
  })
  it('pins the production origin', async () => {
    const bridge = await import('./local-reminder-bridge')
    expect(bridge.VERIFIED_TWA_ORIGIN).toBe('https://quran-seven-lyart.vercel.app')
  })
})

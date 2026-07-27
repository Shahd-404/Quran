import { describe, expect, it, vi } from 'vitest'
import { serializeSubscription, urlBase64ToUint8Array } from '../push'
import { validateVapidPublicKey } from '../subscribe'

describe('push helpers', () => {
  it('converts URL-safe VAPID keys', () => {
    expect(Array.from(urlBase64ToUint8Array('AQIDBA'))).toEqual([1, 2, 3, 4])
  })
  it('rejects missing and invalid public VAPID keys', () => {
    expect(() => validateVapidPublicKey(undefined)).toThrow('VAPID_PUBLIC_KEY_MISSING')
    expect(() => validateVapidPublicKey('not+base64')).toThrow('VAPID_PUBLIC_KEY_INVALID')
    expect(() => validateVapidPublicKey('AQIDBA')).toThrow('VAPID_PUBLIC_KEY_INVALID')
  })
  it('rejects subscriptions without encryption keys', () => {
    expect(serializeSubscription({ toJSON: vi.fn(() => ({ endpoint: 'https://push.test' })) } as unknown as PushSubscription)).toBeNull()
  })
})

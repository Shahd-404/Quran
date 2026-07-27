import { describe, expect, it } from 'vitest'
import { validateMutationRequest } from '../request-guards'

describe('validateMutationRequest', () => {
  it('rejects cross-origin mutations', () => {
    const request = new Request('https://wird.test/api/action', {
      method: 'POST',
      headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
    })
    expect(validateMutationRequest(request, { requireJson: true })).toBe('CROSS_ORIGIN_REQUEST')
  })
  it('requires JSON and bounds declared request sizes', () => {
    expect(validateMutationRequest(new Request('https://wird.test/api/action', { method: 'POST' }), { requireJson: true })).toBe('JSON_REQUIRED')
    const request = new Request('https://wird.test/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '20000' },
    })
    expect(validateMutationRequest(request, { requireJson: true })).toBe('REQUEST_TOO_LARGE')
  })
  it('accepts same-origin JSON mutations', () => {
    const request = new Request('https://wird.test/api/action', {
      method: 'POST',
      headers: { origin: 'https://wird.test', 'content-type': 'application/json' },
    })
    expect(validateMutationRequest(request, { requireJson: true })).toBeNull()
  })
})

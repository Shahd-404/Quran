import { describe, expect, it } from 'vitest'

describe('security headers', () => {
  it('sets restrictive browser headers without allowing framing', async () => {
    const config = require('../../next.config.js')
    const rules = await config.headers()
    const headers = Object.fromEntries(rules[0].headers.map((header: { key: string; value: string }) => [header.key, header.value]))
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Permissions-Policy']).not.toContain('*')
  })
})

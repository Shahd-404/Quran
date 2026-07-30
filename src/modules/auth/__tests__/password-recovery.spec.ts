import { describe, expect, it } from 'vitest'
import {
  getPasswordRecoveryRedirectTo,
  isValidRecoveryEmail,
  mapPasswordRecoveryFailure,
} from '../password-recovery'
import { validateNewPassword } from '../password-policy'

describe('password recovery helpers', () => {
  it('builds the exact production and local reset destinations', () => {
    expect(
      getPasswordRecoveryRedirectTo(
        'https://quran-seven-lyart.vercel.app',
      ),
    ).toBe(
      'https://quran-seven-lyart.vercel.app/auth/reset-password',
    )
    expect(
      getPasswordRecoveryRedirectTo('http://localhost:3000'),
    ).toBe('http://localhost:3000/auth/reset-password')
  })

  it('rejects untrusted or malformed configured site URLs', () => {
    expect(
      getPasswordRecoveryRedirectTo('http://production.example'),
    ).toBeNull()
    expect(
      getPasswordRecoveryRedirectTo('javascript:alert(1)'),
    ).toBeNull()
    expect(
      getPasswordRecoveryRedirectTo(
        'https://user:password@example.com',
      ),
    ).toBeNull()
  })

  it('validates email syntax without account lookup', () => {
    expect(isValidRecoveryEmail('reader@example.com')).toBe(true)
    expect(isValidRecoveryEmail('unknown')).toBe(false)
    expect(isValidRecoveryEmail('reader @example.com')).toBe(false)
  })

  it('maps rate limits without exposing provider details', () => {
    const failure = mapPasswordRecoveryFailure({
      code: 'over_email_send_rate_limit',
      message: 'raw provider response',
    })
    expect(failure).toMatchObject({
      code: 'rate_limited',
      status: 429,
    })
    expect(JSON.stringify(failure)).not.toContain('raw provider')
  })
})

describe('new password policy', () => {
  it('rejects short, padded, and mismatching passwords', () => {
    expect(validateNewPassword('short', 'short')?.field).toBe(
      'password',
    )
    expect(
      validateNewPassword(' password123', ' password123')?.field,
    ).toBe('password')
    expect(
      validateNewPassword('password123', 'different123')?.field,
    ).toBe('confirmPassword')
  })

  it('accepts a matching password under the existing minimum policy', () => {
    expect(
      validateNewPassword('password123', 'password123'),
    ).toBeNull()
  })
})

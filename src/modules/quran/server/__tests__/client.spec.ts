import { describe, expect, it } from 'vitest'
import { resolveQuranEnvironment } from '../client'
import { QuranConfigurationError } from '../errors'

describe('Quran Foundation environment selection', () => {
  it('uses the production provider in Vercel Production', () => {
    expect(
      resolveQuranEnvironment('production', 'production'),
    ).toBe('production')
  })

  it('allows the prelive provider outside Vercel Production', () => {
    expect(resolveQuranEnvironment('prelive', 'preview')).toBe('prelive')
    expect(resolveQuranEnvironment('prelive', undefined)).toBe('prelive')
  })

  it('rejects the prelive provider in Vercel Production', () => {
    expect(() =>
      resolveQuranEnvironment('prelive', 'production'),
    ).toThrow(QuranConfigurationError)
  })

  it('rejects an invalid or missing provider environment', () => {
    expect(() =>
      resolveQuranEnvironment('staging', 'preview'),
    ).toThrow(QuranConfigurationError)
    expect(() =>
      resolveQuranEnvironment(undefined, 'production'),
    ).toThrow(QuranConfigurationError)
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  hasValidInvocationToken,
  REMINDER_INVOCATION_HEADER,
} from './invocation-auth'

describe('reminder invocation authentication', () => {
  it('accepts a matching custom-header token', () => {
    expect(REMINDER_INVOCATION_HEADER).toBe('x-wird-reminder-token')
    expect(hasValidInvocationToken('shared-secret', 'shared-secret')).toBe(true)
  })

  it('rejects a missing token', () => {
    expect(hasValidInvocationToken(null, 'shared-secret')).toBe(false)
  })

  it('rejects a mismatched token', () => {
    expect(hasValidInvocationToken('wrong-secret', 'shared-secret')).toBe(false)
  })

  it('does not require or parse an Authorization value', () => {
    const headers = new Headers({
      Authorization: 'Bearer not-a-jwt',
      [REMINDER_INVOCATION_HEADER]: 'shared-secret',
    })

    expect(
      hasValidInvocationToken(
        headers.get(REMINDER_INVOCATION_HEADER),
        'shared-secret',
      ),
    ).toBe(true)
  })

  it('never logs the provided or expected token', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(hasValidInvocationToken('provided-secret', 'expected-secret')).toBe(false)
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()

    log.mockRestore()
    warn.mockRestore()
    error.mockRestore()
  })
})

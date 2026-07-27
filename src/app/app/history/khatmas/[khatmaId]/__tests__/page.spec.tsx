import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notFound, redirect } from 'next/navigation'
import { getKhatmaHistory } from '@/modules/history/server/get-khatma-history'
import KhatmaHistoryPage from '../page'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/modules/history/server/get-khatma-history', () => ({
  getKhatmaHistory: vi.fn(),
}))
vi.mock('next/headers', () => ({ headers: () => new Headers() }))
vi.mock('next/server', () => ({
  NextResponse: class NextResponse extends Response {},
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

const KHATMA_ID = '11111111-1111-1111-1111-111111111111'

describe('KhatmaHistoryPage route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated visitors to login', async () => {
    vi.mocked(getKhatmaHistory).mockResolvedValue({
      status: 'unauthenticated',
    })

    await expect(
      KhatmaHistoryPage({
        params: { khatmaId: KHATMA_ID },
        searchParams: {},
      }),
    ).rejects.toThrow('REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('returns not found without revealing a foreign or malformed khatma', async () => {
    vi.mocked(getKhatmaHistory).mockResolvedValue({
      status: 'not_found',
    })

    await expect(
      KhatmaHistoryPage({
        params: { khatmaId: KHATMA_ID },
        searchParams: {},
      }),
    ).rejects.toThrow('NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})

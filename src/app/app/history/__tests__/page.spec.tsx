import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { redirect } from 'next/navigation'
import { getReadingHistory } from '@/modules/history/server/get-reading-history'
import ReadingHistoryPage from '../page'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/modules/history/server/get-reading-history', () => ({
  getReadingHistory: vi.fn(),
}))
vi.mock('next/headers', () => ({ headers: () => new Headers() }))
vi.mock('next/server', () => ({
  NextResponse: class NextResponse extends Response {},
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`)
  }),
}))

describe('ReadingHistoryPage route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated visitors to login', async () => {
    vi.mocked(getReadingHistory).mockResolvedValue({
      status: 'unauthenticated',
    })

    await expect(
      ReadingHistoryPage({ searchParams: {} }),
    ).rejects.toThrow('REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('renders only a safe Arabic database error', async () => {
    vi.mocked(getReadingHistory).mockResolvedValue({
      status: 'error',
      message: 'تعذّر تحميل سجل القراءة الآن. حاول مرة أخرى بعد قليل.',
    })

    const html = renderToStaticMarkup(
      await ReadingHistoryPage({ searchParams: { page: '2' } }),
    )

    expect(html).toContain('تعذّر عرض سجل القراءة')
    expect(html).not.toMatch(/SQLSTATE|42702|Supabase/)
  })
})

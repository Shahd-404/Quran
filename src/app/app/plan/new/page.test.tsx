import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockRedirect = vi.fn()
const mockPush = vi.fn()
const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => { mockRedirect(...args); throw new Error('redirect') },
  useRouter: () => ({ push: mockPush }),
}))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [], setAll: () => undefined }) }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({ maybeSingle: mockMaybeSingle }),
        }),
      }),
    }),
  }),
}))

import NewReadingPlanPage from './page'

describe('NewReadingPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { email: 'user@example.com' } }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('renders the onboarding form when no active plan exists', async () => {
    const ui = await NewReadingPlanPage({})
    render(ui)

    expect(screen.getByRole('heading', { name: /أنشئ خطة وردك/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/الصفحة الابتدائية/)).toBeInTheDocument()
  })

  it('shows the one-time deletion success state on onboarding', async () => {
    const ui = await NewReadingPlanPage({
      searchParams: { readingDataDeleted: '1' },
    })
    render(ui)

    expect(screen.getByRole('status')).toHaveTextContent(
      'تم مسح بيانات القراءة بنجاح، ويمكنك الآن إنشاء خطة جديدة.',
    )
    expect(screen.getByLabelText(/الصفحة الابتدائية/)).toBeInTheDocument()
  })
})

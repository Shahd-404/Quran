import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuranPage } from '@/modules/quran/types'
import { ReaderSession } from '../../types'
import { ReaderError } from '../reader-error'
import { ReaderView } from '../reader-view'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const session: ReaderSession = {
  id: '11111111-1111-1111-1111-111111111111',
  assignmentId: '22222222-2222-2222-2222-222222222222',
  planId: '33333333-3333-3333-3333-333333333333',
  sessionOrder: 1,
  startPage: 17,
  endPage: 18,
  status: 'in_progress',
  lastOpenedPage: 17,
  firstOpenedAt: '2026-07-26T08:00:00Z',
  lastOpenedAt: '2026-07-26T08:00:00Z',
  assignmentDate: '2026-07-26',
  assignmentStatus: 'pending',
  currentUnreadPage: 17,
}

const page: QuranPage = {
  pageNumber: 17,
  verses: [
    {
      chapterId: 2,
      chapterNameArabic: 'البقرة',
      verseKey: '2:106',
      verseNumber: 106,
      uthmaniText: 'مَا نَنسَخْ مِنْ ءَايَةٍ',
    },
  ],
}

const secondPage: QuranPage = {
  pageNumber: 18,
  verses: [
    {
      chapterId: 3,
      chapterNameArabic: 'آل عمران',
      verseKey: '3:1',
      verseNumber: 1,
      uthmaniText: 'نص الصفحة الثانية',
    },
  ],
}

describe('ReaderView', () => {
  it('renders Uthmani Quran text in a no-translate container', () => {
    const { container } = render(
      <ReaderView
        session={session}
        pages={[page, secondPage]}
        currentPageNumber={17}
        saveWarning={null}
      />,
    )

    expect(screen.getByText('مَا نَنسَخْ مِنْ ءَايَةٍ')).toBeInTheDocument()
    expect(container.querySelector('[translate="no"]')).toHaveClass(
      'notranslate',
    )
    expect(screen.getByText('سورة البقرة')).toBeInTheDocument()
  })

  it('keeps previous and next navigation inside the session range', () => {
    render(
      <ReaderView
        session={session}
        pages={[page, secondPage]}
        currentPageNumber={17}
        saveWarning={null}
      />,
    )

    const previous = screen.getByText('الصفحة السابقة').closest('[aria-disabled]')
    const next = screen.getByRole('link', { name: /الصفحة التالية/ })

    expect(previous).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(previous?.querySelector('.lucide-arrow-right')).toHaveAttribute('aria-hidden', 'true')
    expect(next.querySelector('.lucide-arrow-left')).toHaveAttribute('aria-hidden', 'true')
    expect(next).toHaveAttribute(
      'href',
      '/app/read/11111111-1111-1111-1111-111111111111?page=18',
    )
    expect(screen.getByRole('link', { name: /العودة للوحة الورد/ }).querySelector('.lucide-arrow-right'))
      .toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText(/الصفحة ١ من ٢ ضمن نطاق الجلسة/)).toBeInTheDocument()
  })

  it('shows saved-position context with an explicit completion action', () => {
    render(
      <ReaderView
        session={session}
        pages={[page, secondPage]}
        currentPageNumber={17}
        saveWarning={null}
      />,
    )

    expect(
      screen.getByText(/يُحفظ موضع الصفحة تلقائيًا/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'أتممت قراءة الجلسة' }),
    ).toBeInTheDocument()
  })

  it('keeps review navigation and hides completion for a completed session', () => {
    render(
      <ReaderView
        session={{ ...session, status: 'completed' }}
        pages={[page, secondPage]}
        currentPageNumber={17}
        saveWarning={null}
      />,
    )

    expect(screen.getByText('الجلسة مكتملة')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'أتممت قراءة الجلسة' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /الصفحة التالية/ }),
    ).toHaveAttribute(
      'href',
      '/app/read/11111111-1111-1111-1111-111111111111?page=18',
    )
  })

  it('keeps Quran content visible after a recoverable completion error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'SQLSTATE secret database failure',
        }),
      }),
    )
    render(
      <ReaderView
        session={session}
        pages={[page, secondPage]}
        currentPageNumber={17}
        saveWarning={null}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'أتممت قراءة الجلسة' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'نعم، أتممت القراءة' }),
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText('مَا نَنسَخْ مِنْ ءَايَةٍ'),
    ).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/SQLSTATE|secret database/)
  })

  it('shows a safe retry state without raw provider details', () => {
    render(
      <ReaderError
        session={session}
        pageNumber={17}
        message="تعذّر تحميل صفحة القرآن الآن."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'تعذّر تحميل صفحة القرآن الآن.',
    )
    expect(screen.queryByText(/invalid_client|token|SQLSTATE/)).not.toBeInTheDocument()
  })

  it('renders every loaded page once in ascending order with visible boundaries', () => {
    const { container } = render(
      <ReaderView
        session={session}
        pages={[page, secondPage]}
        currentPageNumber={17}
        saveWarning={null}
      />,
    )

    expect(
      [...container.querySelectorAll('[data-quran-page]')].map((element) =>
        element.getAttribute('data-quran-page'),
      ),
    ).toEqual(['17', '18'])
    expect(screen.getByRole('heading', { name: 'صفحة ١٧' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'صفحة ١٨' })).toBeInTheDocument()
  })
})

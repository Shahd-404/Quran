import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuranPage } from '../types'
import { QcfMushafPage } from './qcf-mushaf-page'

const fontMocks = vi.hoisted(() => ({
  load: vi.fn(),
}))

vi.mock('../client/qcf-v2-font-loader', () => ({
  getQcfV2PageFontFamily: (pageNumber: number) => `p${pageNumber}-v2`,
  loadQcfV2FontsForPage: fontMocks.load,
  QCF_V2_UNICODE_FONT_FAMILY: 'WirdUthmanicHafs',
}))

const page: QuranPage = {
  schemaVersion: 1,
  mushafId: 1,
  pageNumber: 80,
  v2Page: 80,
  lines: [
    {
      lineNumber: 5,
      words: [
        {
          wordId: 8001,
          position: 1,
          pageNumber: 80,
          v2Page: 80,
          lineNumber: 5,
          charTypeName: 'word',
          codeV2: 'ﱁ',
          accessibleText: 'ٱلْحَمْدُ',
          verseKey: '4:1',
          verseNumber: 1,
          chapterId: 4,
        },
        {
          wordId: 8002,
          position: 2,
          pageNumber: 80,
          v2Page: 80,
          lineNumber: 5,
          charTypeName: 'end',
          codeV2: 'ﱂ',
          accessibleText: '١',
          verseKey: '4:1',
          verseNumber: 1,
          chapterId: 4,
        },
      ],
    },
  ],
  verses: [
    {
      chapterId: 4,
      chapterNameArabic: 'النساء',
      verseKey: '4:1',
      verseNumber: 1,
      accessibleText: 'ٱلْحَمْدُ ١',
    },
  ],
  headings: [
    {
      chapterId: 4,
      chapterNameArabic: 'النساء',
      titleLineNumber: 3,
      bismillahLineNumber: 4,
      beforeLineNumber: 5,
      bismillahText: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    },
  ],
}

describe('QcfMushafPage', () => {
  beforeEach(() => {
    fontMocks.load.mockReset()
    fontMocks.load.mockResolvedValue(undefined)
  })

  it('renders all fixed layout rows with the matching page font and no reflow', async () => {
    const { container } = render(<QcfMushafPage page={page} />)

    await waitFor(() =>
      expect(container.querySelector('[data-qcf-page="80"]')).toBeInTheDocument(),
    )
    const visualPage = container.querySelector('[data-qcf-page="80"]')
    expect(visualPage).toHaveAttribute('aria-hidden', 'true')
    expect(visualPage).toHaveAttribute('data-qcf-font-family', 'p80-v2')
    expect(container.querySelectorAll('[data-qcf-line]')).toHaveLength(15)
    expect(container.querySelector('[data-qcf-line="5"]')).toHaveStyle({
      fontFamily: "'p80-v2', serif",
    })
    expect(container.querySelector('[data-qcf-word="8001"]')?.innerHTML).toBe(
      'ﱁ',
    )
    expect(container.querySelector('[data-qcf-word="8002"]')).toHaveTextContent(
      '١',
    )
  })

  it('keeps official Arabic text available to screen readers without duplicate glyph reading', async () => {
    const { container } = render(<QcfMushafPage page={page} />)

    expect(screen.getByText(/سورة النساء، الآية ١/)).toBeInTheDocument()
    expect(screen.getByText('ٱلْحَمْدُ ١')).toBeInTheDocument()
    expect(container.querySelector('[data-quran-accessible-page="80"]')).toHaveClass(
      'sr-only',
    )
    await waitFor(() =>
      expect(container.querySelector('[data-qcf-page="80"]')).toHaveAttribute(
        'aria-hidden',
        'true',
      ),
    )
  })

  it('renders from a complete stored page without requesting Quran data', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<QcfMushafPage page={page} />)

    await waitFor(() =>
      expect(container.querySelector('[data-qcf-page="80"]')).toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('shows a clear incomplete state and no private-use glyphs when the font is missing', async () => {
    fontMocks.load.mockRejectedValue(new Error('offline font missing'))
    const { container } = render(<QcfMushafPage page={page} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'تعذّر تحميل خط المصحف الكامل',
    )
    expect(container.querySelector('[data-qcf-page="80"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-quran-accessible-page="80"]')).toBeInTheDocument()
  })
})

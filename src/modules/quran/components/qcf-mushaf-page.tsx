'use client'

import React, { Fragment, useEffect, useMemo, useState } from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { QCF_V2_MAX_LINE_NUMBER } from '../qcf-v2'
import type { QuranPage, QuranPageHeading } from '../types'
import {
  getQcfV2PageFontFamily,
  loadQcfV2FontsForPage,
  QCF_V2_UNICODE_FONT_FAMILY,
} from '../client/qcf-v2-font-loader'

type FontStatus = 'loading' | 'ready' | 'unavailable'

function headingsByLine(headings: QuranPageHeading[]): {
  titles: Map<number, QuranPageHeading>
  bismillahs: Map<number, QuranPageHeading>
} {
  const titles = new Map<number, QuranPageHeading>()
  const bismillahs = new Map<number, QuranPageHeading>()
  headings.forEach((heading) => {
    titles.set(heading.titleLineNumber, heading)
    if (heading.bismillahLineNumber !== null) {
      bismillahs.set(heading.bismillahLineNumber, heading)
    }
  })
  return { titles, bismillahs }
}

export function QcfMushafPage({ page }: { page: QuranPage }) {
  const [fontStatus, setFontStatus] = useState<FontStatus>('loading')
  const pageFontFamily = getQcfV2PageFontFamily(page.pageNumber)
  const lines = useMemo(
    () => new Map(page.lines.map((line) => [line.lineNumber, line])),
    [page.lines],
  )
  const decorativeLines = useMemo(
    () => headingsByLine(page.headings),
    [page.headings],
  )

  useEffect(() => {
    let active = true
    setFontStatus('loading')
    loadQcfV2FontsForPage(page.pageNumber).then(
      () => {
        if (active) setFontStatus('ready')
      },
      () => {
        if (active) setFontStatus('unavailable')
      },
    )
    return () => {
      active = false
    }
  }, [page.pageNumber])

  return (
    <section
      className="qcf-page-viewport"
      aria-label={`النص المقروء للصفحة ${formatArabicNumber(page.pageNumber)}`}
    >
      <div className="sr-only" data-quran-accessible-page={page.pageNumber}>
        {page.verses.map((verse) => (
          <p key={verse.verseKey}>
            <span>
              {verse.chapterNameArabic
                ? `سورة ${verse.chapterNameArabic}`
                : `السورة ${formatArabicNumber(verse.chapterId)}`}
              ، الآية {formatArabicNumber(verse.verseNumber)}:{' '}
            </span>
            {verse.accessibleText}
          </p>
        ))}
      </div>

      {fontStatus === 'loading' ? (
        <div className="qcf-page-state" role="status">
          يتم تحميل خط المصحف للصفحة{' '}
          {formatArabicNumber(page.pageNumber)}…
        </div>
      ) : null}

      {fontStatus === 'unavailable' ? (
        <div className="qcf-page-state qcf-page-state-error" role="alert">
          تعذّر تحميل خط المصحف الكامل لهذه الصفحة. تحقّقي من الاتصال أو من
          اكتمال تنزيل الصفحة ثم أعيدي المحاولة.
        </div>
      ) : null}

      {fontStatus === 'ready' ? (
        <div
          className="qcf-page-paper notranslate"
          data-qcf-font-family={pageFontFamily}
          data-qcf-page={page.pageNumber}
          dir="rtl"
          translate="no"
          aria-hidden="true"
        >
          <div className="qcf-page-grid">
            {Array.from(
              { length: QCF_V2_MAX_LINE_NUMBER },
              (_, index) => index + 1,
            ).map((lineNumber) => {
              const line = lines.get(lineNumber)
              const title = decorativeLines.titles.get(lineNumber)
              const bismillah = decorativeLines.bismillahs.get(lineNumber)

              if (title) {
                return (
                  <div
                    key={`title-${title.chapterId}-${lineNumber}`}
                    className="qcf-mushaf-row qcf-surah-heading"
                    data-qcf-line={lineNumber}
                  >
                    <span>سورة {title.chapterNameArabic}</span>
                  </div>
                )
              }

              if (bismillah?.bismillahText) {
                return (
                  <div
                    key={`bismillah-${bismillah.chapterId}-${lineNumber}`}
                    className="qcf-mushaf-row qcf-bismillah"
                    data-qcf-line={lineNumber}
                    style={{
                      fontFamily: `'${QCF_V2_UNICODE_FONT_FAMILY}', serif`,
                    }}
                  >
                    {bismillah.bismillahText}
                  </div>
                )
              }

              return (
                <div
                  key={`line-${lineNumber}`}
                  className="qcf-mushaf-row qcf-mushaf-line"
                  data-qcf-line={lineNumber}
                  style={{ fontFamily: `'${pageFontFamily}', serif` }}
                >
                  {line?.words.map((word, wordIndex) => (
                    <Fragment key={word.wordId}>
                      {wordIndex > 0 ? ' ' : null}
                      {word.charTypeName === 'end' ? (
                        <span
                          className="qcf-verse-end"
                          data-qcf-word={word.wordId}
                          style={{
                            fontFamily: `'${QCF_V2_UNICODE_FONT_FAMILY}', serif`,
                          }}
                        >
                          {word.accessibleText}
                        </span>
                      ) : (
                        <span
                          className="qcf-word"
                          data-qcf-word={word.wordId}
                          dangerouslySetInnerHTML={{ __html: word.codeV2 }}
                        />
                      )}
                    </Fragment>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

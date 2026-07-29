import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { QuranPage, QuranVerse } from '@/modules/quran/types'
import { CompletionAction } from '@/modules/session-completion/components/completion-action'
import { ReaderPersistedStatus, ReaderSession } from '../types'

const STATUS_LABELS: Record<ReaderPersistedStatus, string> = {
  pending: 'لم تبدأ',
  in_progress: 'قيد القراءة',
  completed: 'مكتملة',
}

type VerseGroup = {
  chapterId: number
  chapterNameArabic: string | null
  verses: QuranVerse[]
}

function groupVerses(verses: QuranVerse[]): VerseGroup[] {
  return verses.reduce<VerseGroup[]>((groups, verse) => {
    const current = groups.at(-1)
    if (current?.chapterId === verse.chapterId) {
      current.verses.push(verse)
      return groups
    }
    groups.push({
      chapterId: verse.chapterId,
      chapterNameArabic: verse.chapterNameArabic,
      verses: [verse],
    })
    return groups
  }, [])
}

function pageHref(sessionId: string, pageNumber: number): string {
  return `/app/read/${sessionId}?page=${pageNumber}`
}

function NavigationLink({
  direction,
  disabled,
  href,
}: {
  direction: 'previous' | 'next'
  disabled: boolean
  href: string
}) {
  const label = direction === 'previous' ? 'الصفحة السابقة' : 'الصفحة التالية'
  const DirectionIcon = direction === 'previous' ? ArrowRight : ArrowLeft
  const classes =
    'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition'

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${classes} cursor-not-allowed bg-elevated text-muted/50`}
      >
        <DirectionIcon aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
        {label}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={`${classes} bg-primary text-white hover:bg-primary-strong`}
    >
      <DirectionIcon aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
      {label}
    </Link>
  )
}

export function ReaderView({
  session,
  pages,
  currentPageNumber,
  saveWarning,
}: {
  session: ReaderSession
  pages: QuranPage[]
  currentPageNumber: number
  saveWarning: string | null
}) {
  const currentPage = currentPageNumber
  const pagePosition = currentPage - session.startPage + 1
  const sessionPageCount = session.endPage - session.startPage + 1

  return (
    <main className="page-shell !py-5 sm:!py-8">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="surface-card px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/app"
              className="btn-secondary min-h-[2.75rem] px-4 py-2 text-sm"
            >
              <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
              العودة للوحة الورد
            </Link>
            <div className="text-left">
              <p className="text-xs font-medium text-primary-muted">
                جلسة الورد {formatArabicNumber(session.sessionOrder)}
              </p>
              <p className="mt-1 font-semibold">
                الصفحات {formatArabicNumber(session.startPage)}–
                {formatArabicNumber(session.endPage)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-line/70 pt-4">
            <div>
              <p className="text-sm text-muted">الصفحة الحالية</p>
              <h1 className="mt-1 text-3xl font-bold">
                {formatArabicNumber(currentPage)}
              </h1>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary-muted">
              {STATUS_LABELS[session.status]}
            </span>
          </div>
        </header>

        {saveWarning ? (
          <div
            role="status"
            className="status-warning mt-4 text-sm leading-6"
          >
            {saveWarning}
          </div>
        ) : null}

        <div
          className="mt-5 space-y-5"
          aria-label="صفحات جلسة الورد"
        >
          {pages.map((page) => {
            const verseGroups = groupVerses(page.verses)
            const isCurrentPage = page.pageNumber === currentPage

            return (
              <article
                id={`quran-page-${page.pageNumber}`}
                key={page.pageNumber}
                data-quran-page={page.pageNumber}
                data-current-page={isCurrentPage ? 'true' : undefined}
                className={`surface-card px-5 py-8 sm:px-10 sm:py-12 ${
                  isCurrentPage ? 'ring-2 ring-primary/25' : ''
                }`}
                aria-labelledby={`quran-page-title-${page.pageNumber}`}
              >
                <h2
                  id={`quran-page-title-${page.pageNumber}`}
                  className="mb-7 border-b border-line/70 pb-4 text-center text-sm font-semibold text-primary-muted"
                >
                  صفحة {formatArabicNumber(page.pageNumber)}
                </h2>
                {verseGroups.map((group) => (
                  <section
                    key={`${page.pageNumber}-${group.chapterId}`}
                    className="notranslate [&+&]:mt-10"
                    translate="no"
                    aria-label={
                      group.chapterNameArabic
                        ? `سورة ${group.chapterNameArabic}`
                        : `السورة ${group.chapterId}`
                    }
                  >
                    <h3 className="mx-auto mb-7 max-w-xl rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-center text-xl font-bold text-ink">
                      سورة{' '}
                      {group.chapterNameArabic ??
                        formatArabicNumber(group.chapterId)}
                    </h3>
                    <p
                      className="text-center text-[1.7rem] leading-[2.65] text-ink sm:text-[2rem] sm:leading-[2.8]"
                      style={{
                        fontFamily:
                          "'UthmanicHafs', 'Traditional Arabic', 'Amiri', serif",
                      }}
                    >
                      {group.verses.map((verse) => (
                        <span key={verse.verseKey}>
                          <span>{verse.uthmaniText}</span>{' '}
                          <span
                            className="whitespace-nowrap text-[0.72em] font-bold text-primary-muted"
                            aria-label={`الآية ${verse.verseNumber}`}
                          >
                            ﴿{formatArabicNumber(verse.verseNumber)}﴾
                          </span>{' '}
                        </span>
                      ))}
                    </p>
                  </section>
                ))}
              </article>
            )
          })}
        </div>

        <nav
          aria-label="التنقل بين صفحات جلسة الورد"
          className="surface-card mt-5 p-4 sm:p-5"
        >
          <p className="mb-4 text-center text-sm font-semibold text-muted">
            الصفحة {formatArabicNumber(pagePosition)} من{' '}
            {formatArabicNumber(sessionPageCount)} ضمن نطاق الجلسة
          </p>
          <div className="grid grid-cols-2 gap-3">
            <NavigationLink
              direction="previous"
              disabled={currentPage === session.startPage}
              href={pageHref(session.id, currentPage - 1)}
            />
            <NavigationLink
              direction="next"
              disabled={currentPage === session.endPage}
              href={pageHref(session.id, currentPage + 1)}
            />
          </div>
        </nav>

        {session.status === 'completed' ? (
          <section
            aria-label="حالة الجلسة"
            className="status-success mt-5 text-center"
          >
            <h2 className="text-lg font-bold">الجلسة مكتملة</h2>
            <p className="mt-2 text-sm leading-7">
              يمكنك التنقّل بين صفحاتها للمراجعة دون تسجيل تقدّم جديد.
            </p>
          </section>
        ) : (
          <CompletionAction sessionId={session.id} />
        )}

        <aside className="mt-5 rounded-card border border-primary/20 bg-primary-soft p-5 text-sm leading-7 text-primary-muted">
          <h2 className="text-base font-bold">عن جلسة الورد</h2>
          <p className="mt-2">
            الجلسة {formatArabicNumber(session.sessionOrder)} · الصفحات{' '}
            {formatArabicNumber(session.startPage)}–
            {formatArabicNumber(session.endPage)} ·{' '}
            {STATUS_LABELS[session.status]}
          </p>
          <p className="mt-1">
            يُحفظ موضع الصفحة تلقائيًا عند فتح الجلسة أو الانتقال بين صفحاتها.
          </p>
          {session.status === 'completed' ? (
            <p className="mt-1 font-semibold">
              هذه الجلسة مكتملة ومتاحة للمراجعة فقط.
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  )
}

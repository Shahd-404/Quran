import React from 'react'
import Link from 'next/link'
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
  const arrow = direction === 'previous' ? '→' : '←'
  const classes =
    'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition sm:text-base'

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${classes} cursor-not-allowed bg-stone-100 text-stone-400`}
      >
        <span aria-hidden="true">{arrow}</span>
        {label}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={`${classes} bg-emerald-900 text-white hover:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800`}
    >
      <span aria-hidden="true">{arrow}</span>
      {label}
    </Link>
  )
}

export function ReaderView({
  session,
  page,
  saveWarning,
}: {
  session: ReaderSession
  page: QuranPage
  saveWarning: string | null
}) {
  const currentPage = page.pageNumber
  const pagePosition = currentPage - session.startPage + 1
  const sessionPageCount = session.endPage - session.startPage + 1
  const verseGroups = groupVerses(page.verses)

  return (
    <div className="-m-4 min-h-screen bg-[#f7f6f2] text-stone-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/app"
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-2xl bg-stone-100 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              <span aria-hidden="true">→</span>
              العودة للوحة الورد
            </Link>
            <div className="text-left">
              <p className="text-sm font-semibold text-emerald-800">
                جلسة الورد {formatArabicNumber(session.sessionOrder)}
              </p>
              <p className="mt-1 font-bold">
                الصفحات {formatArabicNumber(session.startPage)}–
                {formatArabicNumber(session.endPage)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-stone-100 pt-4">
            <div>
              <p className="text-sm text-stone-500">الصفحة الحالية</p>
              <h1 className="mt-1 text-3xl font-bold">
                {formatArabicNumber(currentPage)}
              </h1>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800">
              {STATUS_LABELS[session.status]}
            </span>
          </div>
        </header>

        {saveWarning ? (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            {saveWarning}
          </div>
        ) : null}

        <article className="mt-5 rounded-[2rem] border border-stone-200 bg-[#fffefb] px-5 py-8 shadow-[0_12px_40px_rgba(28,25,23,0.06)] sm:px-10 sm:py-12">
          {verseGroups.map((group) => (
            <section
              key={`${currentPage}-${group.chapterId}`}
              className="notranslate [&+&]:mt-10"
              translate="no"
              aria-label={
                group.chapterNameArabic
                  ? `سورة ${group.chapterNameArabic}`
                  : `السورة ${group.chapterId}`
              }
            >
              <h2 className="mx-auto mb-7 max-w-xl rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-center text-xl font-bold text-emerald-950">
                سورة{' '}
                {group.chapterNameArabic ??
                  formatArabicNumber(group.chapterId)}
              </h2>
              <p
                className="text-center text-[1.7rem] leading-[2.65] text-stone-950 sm:text-[2rem] sm:leading-[2.8]"
                style={{
                  fontFamily:
                    "'UthmanicHafs', 'Traditional Arabic', 'Amiri', serif",
                }}
              >
                {group.verses.map((verse) => (
                  <span key={verse.verseKey}>
                    <span>{verse.uthmaniText}</span>{' '}
                    <span
                      className="whitespace-nowrap text-[0.72em] font-bold text-emerald-800"
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

        <nav
          aria-label="التنقل بين صفحات جلسة الورد"
          className="mt-5 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <p className="mb-4 text-center text-sm font-semibold text-stone-600">
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
            className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-950"
          >
            <h2 className="text-lg font-bold">الجلسة مكتملة</h2>
            <p className="mt-2 text-sm leading-7">
              يمكنك التنقّل بين صفحاتها للمراجعة دون تسجيل تقدّم جديد.
            </p>
          </section>
        ) : (
          <CompletionAction sessionId={session.id} />
        )}

        <aside className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 text-sm leading-7 text-emerald-950">
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
    </div>
  )
}

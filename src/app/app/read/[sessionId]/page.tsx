import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSafeQuranErrorMessage } from '@/modules/quran/server/errors'
import type { QuranPage } from '@/modules/quran/types'
import {
  createQuranCorrelationId,
  loadQuranPageRange,
} from '@/modules/quran/server/get-page-range'
import { ReaderError } from '@/modules/reader/components/reader-error'
import { ReaderView } from '@/modules/reader/components/reader-view'
import { selectReaderPage } from '@/modules/reader/page-selection'
import { getReaderSession } from '@/modules/reader/server/get-reader-session'
import { recordReadingPosition } from '@/modules/reader/server/record-reading-position'

export const dynamic = 'force-dynamic'

type ReaderPageProps = {
  params: { sessionId: string }
  searchParams?: { page?: string | string[] }
}

export default async function ReadingSessionPage({
  params,
  searchParams,
}: ReaderPageProps) {
  const response = new NextResponse()
  const request = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(request, response)
  const result = await getReaderSession(client, params.sessionId)

  if (result.status === 'unauthenticated') {
    redirect('/login')
  }
  if (result.status === 'not_found') {
    notFound()
  }
  if (result.status === 'error') {
    return <ReaderError message={result.message} />
  }

  const session = result.session
  const selection = selectReaderPage(session, searchParams?.page)
  if (selection.shouldRedirect) {
    redirect(`/app/read/${session.id}?page=${selection.pageNumber}`)
  }

  const correlationId = createQuranCorrelationId()
  let pages: QuranPage[]
  try {
    pages = await loadQuranPageRange(session.startPage, session.endPage, {
      correlationId,
    })
  } catch (error) {
    return (
      <ReaderError
        correlationId={correlationId}
        session={session}
        pageNumber={selection.pageNumber}
        message={getSafeQuranErrorMessage(error)}
      />
    )
  }

  const positionResult = await recordReadingPosition(
    client,
    session,
    selection.pageNumber,
  )
  const displayedSession =
    positionResult.success &&
    positionResult.changed &&
    session.status === 'pending'
      ? {
          ...session,
          status: 'in_progress' as const,
          lastOpenedPage: selection.pageNumber,
        }
      : session
  return (
    <ReaderView
      session={displayedSession}
      pages={pages}
      currentPageNumber={selection.pageNumber}
      saveWarning={positionResult.success ? null : positionResult.message}
    />
  )
}

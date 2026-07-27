import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSafeQuranErrorMessage } from '@/modules/quran/server/errors'
import { getQuranPage } from '@/modules/quran/server/get-page'
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

  try {
    const page = await getQuranPage(selection.pageNumber)
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
        page={page}
        saveWarning={
          positionResult.success ? null : positionResult.message
        }
      />
    )
  } catch (error) {
    return (
      <ReaderError
        session={session}
        pageNumber={selection.pageNumber}
        message={getSafeQuranErrorMessage(error)}
      />
    )
  }
}

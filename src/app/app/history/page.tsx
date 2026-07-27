import React from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  HistoryError,
  HistoryPage,
} from '@/modules/history/components/history-page'
import { getReadingHistory } from '@/modules/history/server/get-reading-history'

export const dynamic = 'force-dynamic'

export default async function ReadingHistoryPage({
  searchParams,
}: {
  searchParams?: { page?: string | string[] }
}) {
  const response = new NextResponse()
  const request = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(request, response)
  const result = await getReadingHistory(client, searchParams?.page)

  if (result.status === 'unauthenticated') redirect('/login')
  if (result.status === 'error') {
    return <HistoryError message={result.message} />
  }

  return <HistoryPage data={result.data} />
}

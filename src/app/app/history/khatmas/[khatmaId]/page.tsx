import React from 'react'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { HistoryError } from '@/modules/history/components/history-page'
import { KhatmaDetails } from '@/modules/history/components/khatma-details'
import { getKhatmaHistory } from '@/modules/history/server/get-khatma-history'

export const dynamic = 'force-dynamic'

export default async function KhatmaHistoryPage({
  params,
  searchParams,
}: {
  params: { khatmaId: string }
  searchParams?: { page?: string | string[] }
}) {
  const response = new NextResponse()
  const request = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(request, response)
  const result = await getKhatmaHistory(
    client,
    params.khatmaId,
    searchParams?.page,
  )

  if (result.status === 'unauthenticated') redirect('/login')
  if (result.status === 'not_found') notFound()
  if (result.status === 'error') {
    return <HistoryError message={result.message} />
  }

  return <KhatmaDetails data={result.data} />
}

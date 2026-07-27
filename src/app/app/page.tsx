import React from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Dashboard } from '@/modules/dashboard/components/dashboard'
import {
  CompletedKhatmaState,
  DashboardError,
  FuturePlanState,
  NoActivePlan,
} from '@/modules/dashboard/components/dashboard-states'
import { getDashboardData } from '@/modules/dashboard/server/get-dashboard-data'

export const dynamic = 'force-dynamic'

export default async function AppPage({
  searchParams,
}: {
  searchParams?: {
    sessionCompleted?: string | string[]
    planUpdated?: string | string[]
  }
}) {
  const response = new NextResponse()
  const request = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(request, response)
  const result = await getDashboardData(client)

  if (result.status === 'unauthenticated') redirect('/login')
  if (result.status === 'no_active_plan') {
    return <NoActivePlan displayName={result.displayName} />
  }
  if (result.status === 'error') {
    return <DashboardError displayName={result.displayName} message={result.message} />
  }
  if (result.status === 'completed_khatma') {
    return <CompletedKhatmaState data={result.data} />
  }
  if (result.status === 'future_plan') {
    return <FuturePlanState data={result.data} />
  }

  return (
    <Dashboard
      data={result.data}
      completionRecorded={searchParams?.sessionCompleted === '1'}
      planUpdated={searchParams?.planUpdated === '1'}
    />
  )
}

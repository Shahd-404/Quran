import { createServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { userHasActiveReadingPlan } from './get-active-plan'

export type AppPageData = {
  userId: string | null
  displayName: string | null
  hasActivePlan: boolean
}

export async function loadAppPageData(): Promise<AppPageData> {
  const res = new Response()
  const req = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(req as any, res as any)
  const { data: userData } = await client.auth.getUser()
  const user = userData?.user || null

  if (!user) {
    return { userId: null, displayName: null, hasActivePlan: false }
  }

  const profileQ = await client.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
  const displayName = profileQ?.data?.display_name || null
  const hasActivePlan = await userHasActiveReadingPlan(client)

  return { userId: user.id, displayName, hasActivePlan }
}

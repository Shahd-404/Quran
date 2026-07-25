import React from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  // Server-side check: ensure the user is present and load profile
  const res = new Response()
  const client = await createServerClient({ headers: new Headers() } as any, res as any)
  const { data: userData } = await client.auth.getUser()
  const user = userData?.user || null
  if (!user) return redirect('/login')

  // Load profile
  const profileQ = await client.from('public.profiles').select('display_name').eq('id', user.id).maybeSingle()
  const display_name = profileQ?.data?.display_name || null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <main className="max-w-md w-full bg-white p-6 rounded shadow text-center">
        <h1 className="text-xl font-semibold mb-4">ورد</h1>
        {display_name ? <p className="mb-2">مرحبًا، {display_name}</p> : <p className="mb-2">مرحبًا — تم تسجيل الدخول</p>}
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full p-2 bg-red-600 text-white rounded">تسجيل الخروج</button>
        </form>
      </main>
    </div>
  )
}

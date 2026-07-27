import React from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { PlanSettingsForm } from '@/modules/reading-plan/settings/components/plan-settings-form'
import { getPlanSettings } from '@/modules/reading-plan/settings/server/get-plan-settings'

export const dynamic = 'force-dynamic'

export default async function PlanSettingsPage() {
  const response = new NextResponse()
  const request = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(request, response)
  const result = await getPlanSettings(client)

  if (result.status === 'unauthenticated') redirect('/login')
  if (result.status === 'no_active_plan') redirect('/app')

  if (result.status === 'error') {
    return (
      <main className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-stone-900">
        <section
          role="alert"
          className="mx-auto max-w-xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm"
        >
          <h1 className="text-2xl font-bold">تعذّر تحميل إعدادات الخطة</h1>
          <p className="mt-3 leading-7 text-stone-600">
            حاول العودة إلى لوحة الورد وفتح الإعدادات مرة أخرى.
          </p>
          <a
            href="/app"
            className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-stone-900 px-6 py-3 font-bold text-white"
          >
            العودة إلى لوحة الورد
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-stone-900 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <a className="text-sm font-semibold text-emerald-800" href="/app">
            العودة إلى لوحة الورد
          </a>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            تعديل الخطة
          </h1>
          <p className="mt-3 max-w-2xl leading-8 text-stone-600">
            عدّل عدد الصفحات والجلسات ومواعيدها. لن يتغير تقدم الختمة أو أي ورد
            تم إنشاؤه بالفعل.
          </p>
        </header>

        <PlanSettingsForm current={result.data} />
      </div>
    </main>
  )
}

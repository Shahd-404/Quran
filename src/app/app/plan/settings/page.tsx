import React from 'react'
import { ArrowRight, TriangleAlert } from 'lucide-react'
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
      <main className="page-shell">
        <section
          role="alert"
          className="surface-card mx-auto max-w-xl border-danger/30 p-8 text-center"
        >
          <TriangleAlert aria-hidden="true" focusable="false" className="mx-auto text-danger" size={22} strokeWidth={1.8} />
          <h1 className="text-2xl font-bold">تعذّر تحميل إعدادات الخطة</h1>
          <p className="mt-3 leading-7 text-muted">
            حاول العودة إلى لوحة الورد وفتح الإعدادات مرة أخرى.
          </p>
          <a
            href="/app"
            className="btn-primary mt-6"
          >
            <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
            العودة إلى لوحة الورد
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <header className="mb-5">
          <a className="inline-flex items-center gap-2 text-sm font-medium text-primary-muted hover:underline" href="/app">
            <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
            العودة إلى لوحة الورد
          </a>
          <h1 className="page-title">
            تعديل الخطة
          </h1>
          <p className="page-description">
            عدّل عدد الصفحات والجلسات ومواعيدها. لن يتغير تقدم الختمة أو أي ورد
            تم إنشاؤه بالفعل.
          </p>
        </header>

        <PlanSettingsForm current={result.data} />
      </div>
    </main>
  )
}

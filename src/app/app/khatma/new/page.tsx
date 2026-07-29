import React from 'react'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getLocalDateString } from '@/modules/dashboard/formatting'
import { NewKhatmaForm } from '@/modules/khatma/components/new-khatma-form'
import { getPreviousPlan } from '@/modules/khatma/server/get-previous-plan'

export const dynamic = 'force-dynamic'

export default async function NewKhatmaPage() {
  const response = new NextResponse()
  const request = new Request('http://localhost', { headers: headers() })
  const client = await createServerClient(request, response)
  const result = await getPreviousPlan(client)

  if (result.status === 'unauthenticated') redirect('/login')
  if (result.status === 'active_plan') redirect('/app')
  if (result.status === 'not_found') redirect('/app')

  if (result.status === 'error') {
    return (
      <main className="page-shell">
        <section
          role="alert"
          className="surface-card mx-auto max-w-xl border-danger/30 p-8 text-center"
        >
          <TriangleAlert aria-hidden="true" focusable="false" className="mx-auto text-danger" size={22} strokeWidth={1.8} />
          <h1 className="text-2xl font-bold">تعذّر تجهيز الختمة الجديدة</h1>
          <p className="mt-3 leading-7 text-muted">
            لم نتمكن من تحميل إعدادات خطتك السابقة الآن. حاول مرة أخرى بعد قليل.
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

  let initialEffectiveFrom: string
  try {
    initialEffectiveFrom = getLocalDateString(new Date(), result.data.timezone)
  } catch {
    return (
      <main className="page-shell">
        <section role="alert" className="surface-card mx-auto max-w-xl p-8 text-center">
          تعذّر التحقق من المنطقة الزمنية للخطة السابقة.
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-5">
          <a className="inline-flex items-center gap-2 text-sm font-medium text-primary-muted hover:underline" href="/app">
            <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
            العودة إلى لوحة الورد
          </a>
          <h1 className="page-title">
            ابدأ ختمة جديدة
          </h1>
          <p className="page-description">
            راجع إعدادات ختمتك السابقة، ثم اختر الاحتفاظ بها أو إنشاء خطة مختلفة.
            لن تبدأ أي ختمة دون تأكيدك.
          </p>
        </header>

        <NewKhatmaForm
          configuration={result.data}
          initialEffectiveFrom={initialEffectiveFrom}
        />
      </div>
    </main>
  )
}

import React from 'react'

export default function KhatmaHistoryNotFound() {
  return (
    <main className="page-shell">
      <section className="surface-card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-bold">لم نعثر على هذه الختمة</h1>
        <p className="mt-3 leading-7 text-muted">
          قد لا تكون الختمة متاحة ضمن سجل حسابك.
        </p>
        <a
          href="/app/history"
          className="btn-primary mt-6"
        >
          العودة إلى سجل القراءة
        </a>
      </section>
    </main>
  )
}

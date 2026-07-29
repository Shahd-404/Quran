import Link from 'next/link'

export default function ReadingSessionNotFound() {
  return (
    <main className="page-shell">
      <section className="surface-card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-bold">جلسة الورد غير موجودة</h1>
        <p className="mt-3 leading-7 text-muted">
          لم نتمكن من العثور على جلسة ورد متاحة لهذا الحساب.
        </p>
        <Link
          href="/app"
          className="btn-primary mt-6"
        >
          العودة للوحة الورد
        </Link>
      </section>
    </main>
  )
}

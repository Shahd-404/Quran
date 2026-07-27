import Link from 'next/link'

export default function ReadingSessionNotFound() {
  return (
    <div className="-m-4 min-h-screen bg-[#f7f6f2] px-4 py-10 text-stone-900">
      <section className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">جلسة الورد غير موجودة</h1>
        <p className="mt-3 leading-7 text-stone-600">
          لم نتمكن من العثور على جلسة ورد متاحة لهذا الحساب.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-emerald-900 px-6 py-3 font-bold text-white hover:bg-emerald-950"
        >
          العودة للوحة الورد
        </Link>
      </section>
    </div>
  )
}

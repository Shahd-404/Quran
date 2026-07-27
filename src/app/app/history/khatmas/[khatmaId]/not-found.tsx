import React from 'react'

export default function KhatmaHistoryNotFound() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-stone-900">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">لم نعثر على هذه الختمة</h1>
        <p className="mt-3 leading-7 text-stone-600">
          قد لا تكون الختمة متاحة ضمن سجل حسابك.
        </p>
        <a
          href="/app/history"
          className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-stone-900 px-5 py-3 font-bold text-white"
        >
          العودة إلى سجل القراءة
        </a>
      </section>
    </main>
  )
}

export default function ReadingSessionLoading() {
  return (
    <div className="-m-4 min-h-screen bg-[#f7f6f2] px-4 py-10 text-stone-900">
      <div
        role="status"
        className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm"
      >
        <div className="mx-auto h-2.5 w-40 animate-pulse rounded-full bg-emerald-100" />
        <p className="mt-5 text-lg font-bold">جارٍ تحميل صفحة الورد…</p>
        <p className="mt-2 text-sm text-stone-500">
          نُحضّر النص القرآني وموضع القراءة.
        </p>
      </div>
    </div>
  )
}

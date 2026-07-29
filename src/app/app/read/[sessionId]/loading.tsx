export default function ReadingSessionLoading() {
  return (
    <main className="page-shell">
      <div
        role="status"
        className="surface-card mx-auto max-w-xl p-8 text-center"
      >
        <div className="mx-auto flex w-40 justify-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
        </div>
        <p className="mt-5 text-lg font-bold">جارٍ تحميل صفحة الورد…</p>
        <p className="mt-2 text-sm text-muted">
          نُحضّر النص القرآني وموضع القراءة.
        </p>
      </div>
    </main>
  )
}

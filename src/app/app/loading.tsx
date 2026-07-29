export default function AppLoading() {
  return (
    <main className="page-shell" aria-busy="true">
      <div className="page-container" role="status" aria-label="جارٍ تحميل وردك">
        <div className="animate-pulse rounded-card bg-hero p-8">
          <div className="h-4 w-32 rounded-full bg-white/15" />
          <div className="mt-5 h-9 w-2/3 max-w-md rounded-xl bg-white/20" />
          <div className="mt-4 h-4 w-1/2 max-w-sm rounded-full bg-white/10" />
          <div className="mt-8 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-20 rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="space-y-6">
            <SkeletonCard height="h-72" />
            <SkeletonCard height="h-48" />
          </div>
          <div className="space-y-6">
            <SkeletonCard height="h-56" />
            <SkeletonCard height="h-64" />
          </div>
        </div>
        <span className="sr-only">جارٍ تحميل وردك…</span>
      </div>
    </main>
  )
}

function SkeletonCard({ height }: { height: string }) {
  return (
    <div className={`surface-card animate-pulse p-6 ${height}`} aria-hidden="true">
      <div className="h-3 w-24 rounded-full bg-primary-soft" />
      <div className="mt-4 h-7 w-1/2 rounded-lg bg-elevated" />
      <div className="mt-7 h-3 w-full rounded-full bg-elevated" />
      <div className="mt-3 h-3 w-4/5 rounded-full bg-elevated" />
    </div>
  )
}

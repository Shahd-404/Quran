import Link from 'next/link'

export default function Home() {
  return (
    <main className="page-shell flex items-center">
      <section className="page-container grid items-center gap-10 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div>
          <p className="eyebrow">قراءة ثابتة، بخطوات هادئة</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.3] tracking-tight text-ink sm:text-5xl">
            وردك اليومي للقرآن،
            <span className="block text-primary-muted">منظّم حول يومك.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-9 text-muted">
            خطّة عربية هادئة تقسّم صفحاتك إلى جلسات واضحة، وتحفظ تقدّمك فقط
            عندما تؤكد إكمال القراءة.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary px-7">
              ابدأ خطة وردك
            </Link>
            <Link href="/login" className="btn-secondary px-7">
              تسجيل الدخول
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            لا تقدّم تلقائيًا — أنت من يؤكد كل جلسة.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="surface-card relative overflow-hidden p-6 shadow-lift sm:p-8">
            <div aria-hidden="true" className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-primary-soft" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">ورد اليوم</p>
                  <h2 className="section-title">خمس صفحات بهدوء</h2>
                </div>
                <span className="rounded-full bg-primary-soft px-4 py-2 font-bold text-primary-muted">
                  ٤٠٪
                </span>
              </div>
              <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-primary-soft">
                <div className="h-full w-2/5 rounded-full bg-primary" />
              </div>
              <div className="mt-7 grid gap-3">
                <PreviewSession title="جلسة الصباح" pages="الصفحات ١٧–١٨" active />
                <PreviewSession title="جلسة المساء" pages="الصفحات ١٩–٢٠" />
                <PreviewSession title="جلسة الليل" pages="الصفحة ٢١" />
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="absolute -bottom-5 -right-5 -z-10 h-28 w-28 rounded-card bg-accent-soft" />
        </div>
      </section>
    </main>
  )
}

function PreviewSession({
  title,
  pages,
  active = false,
}: {
  title: string
  pages: string
  active?: boolean
}) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-4 ${active ? 'border-primary/25 bg-primary-soft' : 'border-line bg-elevated'}`}>
      <div>
        <p className="text-sm text-muted">{title}</p>
        <p className="mt-1 font-bold text-ink">{pages}</p>
      </div>
      <span className={`h-3 w-3 rounded-full ${active ? 'bg-primary' : 'bg-line'}`} />
    </div>
  )
}

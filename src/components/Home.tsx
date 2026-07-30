import Link from 'next/link'
import { CircleCheck } from 'lucide-react'

export default function Home() {
  return (
    <main className="page-shell flex items-center">
      <section className="page-container grid items-center gap-10 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div>
          <p className="eyebrow">قراءة ثابتة، بخطوات هادئة</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-[1.35] tracking-tight text-ink sm:text-4xl">
            وردك اليومي للقرآن،
            <span className="block text-primary-muted">منظّم حول يومك.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
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
          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-muted">
            <CircleCheck aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} className="text-accent" />
            لا تقدّم تلقائيًا — أنت من يؤكد كل جلسة.
          </p>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <section
            className="surface-card p-4 sm:p-6"
            aria-labelledby="daily-wird-preview-title"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">ورد اليوم</p>
              <span className="inline-flex h-8 w-fit shrink-0 items-center rounded-full border border-primary/20 bg-primary-soft px-3 text-xs font-semibold leading-none text-primary-muted">
                ٤٠٪
              </span>
            </div>
            <h2
              id="daily-wird-preview-title"
              className="mt-3 text-lg font-semibold leading-7 text-ink"
            >
              خمس صفحات 
            </h2>
            <div
              className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-primary-soft"
              role="progressbar"
              aria-label="نسبة إنجاز ورد اليوم"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={40}
            >
              <div className="h-full w-2/5 rounded-full bg-primary" />
            </div>
            <div className="mt-5 grid gap-3">
              <PreviewSession title="جلسة الصباح" pages="الصفحات ١٧–١٨" active />
              <PreviewSession title="جلسة المساء" pages="الصفحات ١٩–٢٠" />
              <PreviewSession title="جلسة الليل" pages="الصفحة ٢١" />
            </div>
          </section>
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
        <p className="mt-1 font-semibold text-ink">{pages}</p>
      </div>
      <span className={`h-3 w-3 rounded-full ${active ? 'bg-primary' : 'bg-line'}`} />
    </div>
  )
}

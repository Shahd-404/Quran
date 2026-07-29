import { DeleteReadingDataCard } from '@/modules/account/components/delete-reading-data-card'

export default function PrivacySettingsPage() {
  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <header className="mb-8">
          <a href="/app" className="text-sm font-bold text-primary-muted hover:underline">
            العودة إلى لوحة الورد
          </a>
          <h1 className="page-title">
            الخصوصية والبيانات
          </h1>
          <p className="page-description">
            تحكم في بيانات القراءة المرتبطة بحسابك. سيبقى حسابك وبيانات ملفك الشخصي محفوظين.
          </p>
        </header>
        <section className="surface-card mb-6 grid gap-4 p-5 sm:grid-cols-2 sm:p-6" aria-label="ملخص الخصوصية">
          <div className="flex gap-3">
            <span className="icon-tile" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
                <path d="M12 3l7 3v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3z" strokeLinejoin="round" strokeWidth="1.7" />
              </svg>
            </span>
            <div>
              <h2 className="font-bold text-ink">بياناتك خاصة</h2>
              <p className="mt-1 text-sm leading-6 text-muted">سجل القراءة والخطط مرتبطة بحسابك فقط.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="icon-tile" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
                <path d="M6 7h12M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 14h8l1-14" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              </svg>
            </span>
            <div>
              <h2 className="font-bold text-ink">أنت المتحكم</h2>
              <p className="mt-1 text-sm leading-6 text-muted">يمكنك مسح بيانات القراءة مع إبقاء الحساب.</p>
            </div>
          </div>
        </section>
        <DeleteReadingDataCard />
      </div>
    </main>
  )
}

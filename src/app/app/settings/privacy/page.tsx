import { ArrowRight, ShieldCheck, Trash2 } from 'lucide-react'
import LogoutButton from '@/components/logout-button'
import { DeleteReadingDataCard } from '@/modules/account/components/delete-reading-data-card'

export default function PrivacySettingsPage() {
  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <header className="mb-5">
          <a href="/app" className="inline-flex items-center gap-2 text-sm font-medium text-primary-muted hover:underline">
            <ArrowRight aria-hidden="true" focusable="false" size={18} strokeWidth={1.8} />
            العودة إلى لوحة الورد
          </a>
          <h1 className="page-title">
            الخصوصية والبيانات
          </h1>
          <p className="page-description">
            تحكم في بيانات القراءة المرتبطة بحسابك. سيبقى حسابك وبيانات ملفك الشخصي محفوظين.
          </p>
        </header>
        <section className="surface-card mb-4 grid gap-4 p-4 sm:grid-cols-2 sm:p-5" aria-label="ملخص الخصوصية">
          <div className="flex gap-3">
            <span className="icon-tile" aria-hidden="true">
              <ShieldCheck aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="font-semibold text-ink">بياناتك خاصة</h2>
              <p className="mt-1 text-sm leading-6 text-muted">سجل القراءة والخطط مرتبطة بحسابك فقط.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="icon-tile" aria-hidden="true">
              <Trash2 aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="font-semibold text-ink">أنت المتحكم</h2>
              <p className="mt-1 text-sm leading-6 text-muted">يمكنك مسح بيانات القراءة مع إبقاء الحساب.</p>
            </div>
          </div>
        </section>
        <DeleteReadingDataCard />
        <section className="surface-card mt-4 p-4 sm:p-5" aria-labelledby="account-actions-title">
          <h2 id="account-actions-title" className="text-lg font-semibold text-ink">
            الحساب
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            يمكنك إنهاء جلسة حسابك الحالية دون حذف أي بيانات.
          </p>
          <div className="mt-3 max-w-xs">
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  )
}

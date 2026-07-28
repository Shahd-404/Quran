import { DeleteReadingDataCard } from '@/modules/account/components/delete-reading-data-card'

export default function PrivacySettingsPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-stone-900 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <a href="/app" className="text-sm font-semibold text-emerald-800">
            العودة إلى لوحة الورد
          </a>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            الخصوصية والبيانات
          </h1>
          <p className="mt-3 leading-8 text-stone-600">
            تحكم في بيانات القراءة المرتبطة بحسابك. سيبقى حسابك وبيانات ملفك الشخصي محفوظين.
          </p>
        </header>
        <DeleteReadingDataCard />
      </div>
    </main>
  )
}

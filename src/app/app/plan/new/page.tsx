import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OnboardingForm from '@/modules/reading-plan/onboarding/onboarding-form';

export const dynamic = 'force-dynamic';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables are missing. Check .env.local.',
    );
  }

  return { url, anonKey };
}

export default async function NewReadingPlanPage({
  searchParams,
}: {
  searchParams?: {
    readingDataDeleted?: string | string[];
    browserCleanup?: string | string[];
  };
}) {
  const { url, anonKey } = getSupabaseConfig();
  const cookieStore = cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // تعديل الكوكيز قد لا يكون متاحًا داخل Server Component.
          // الـmiddleware مسؤول عن تحديث جلسة المستخدم.
        }
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: activePlan, error: planError } = await supabase
    .from('reading_plans')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (planError) {
    console.error('Failed to check the active reading plan:', {
      message: planError.message,
      code: planError.code,
    });

    throw new Error('تعذر التحقق من خطة الورد الحالية.');
  }

  if (activePlan) {
    redirect('/app');
  }

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        {searchParams?.readingDataDeleted === '1' ? (
          <div
            role="status"
            className="status-success mb-6 font-semibold"
          >
            تم مسح بيانات القراءة بنجاح، ويمكنك الآن إنشاء خطة جديدة.
          </div>
        ) : null}
        {searchParams?.browserCleanup === 'failed' ? (
          <div
            role="status"
            className="status-warning mb-6"
          >
            تم مسح البيانات من الحساب، لكن تعذر تنظيف اشتراك الإشعارات من هذا المتصفح. لن تُرسل إليه تذكيرات من ورد.
          </div>
        ) : null}
        <header className="mb-8 text-right">
          <a href="/app" className="text-sm font-bold text-primary-muted hover:underline">
            العودة إلى لوحة الورد
          </a>
          <p className="eyebrow mt-5">
            إعداد خطة الورد
          </p>

          <h1 className="page-title">
            أنشئ خطة وردك اليومية
          </h1>

          <p className="page-description">
            حدّد نقطة البداية وعدد الصفحات والجلسات اليومية، ثم راجع الخطة قبل الإنشاء.
          </p>
        </header>

        <OnboardingForm />
      </div>
    </main>
  );
}

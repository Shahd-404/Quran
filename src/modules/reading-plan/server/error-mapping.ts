export const dbCodeToMachineCode = (dbMessage: string | null | undefined) => {
  if (!dbMessage) return 'INTERNAL_ERROR';
  const normalizedMessage = dbMessage.toLowerCase();
  if (normalizedMessage.includes('active_plan_exists')) return 'ACTIVE_PLAN_EXISTS';
  if (normalizedMessage.includes('idx_khatmas_unique_active_per_user')) return 'ACTIVE_PLAN_EXISTS';
  if (normalizedMessage.includes('duplicate key value violates unique constraint')) return 'ACTIVE_PLAN_EXISTS';
  if (normalizedMessage.includes('unauthenticated')) return 'UNAUTHENTICATED';
  if (dbMessage.includes('PROFILE_NOT_FOUND')) return 'PROFILE_NOT_FOUND';
  if (dbMessage.includes('INVALID_START_PAGE')) return 'INVALID_START_PAGE';
  if (dbMessage.includes('INVALID_DAILY_PAGES')) return 'INVALID_DAILY_PAGES';
  if (dbMessage.includes('INVALID_SESSIONS')) return 'INVALID_SESSIONS';
  if (dbMessage.includes('INVALID_SCHEDULE')) return 'INVALID_SCHEDULE';
  if (dbMessage.includes('INVALID_TIMEZONE')) return 'INVALID_TIMEZONE';
  if (dbMessage.includes('INVALID_EFFECTIVE_DATE')) return 'INVALID_EFFECTIVE_DATE';
  if (dbMessage.includes('INTERNAL_ERROR')) return 'INTERNAL_ERROR';
  return 'INTERNAL_ERROR';
};

export const codeToArabic = (code: string) => {
  switch (code) {
    case 'ACTIVE_PLAN_EXISTS':
      return 'لديك خطة ورد نشطة بالفعل.';
    case 'UNAUTHENTICATED':
      return 'يجب تسجيل الدخول أولًا.';
    case 'PROFILE_NOT_FOUND':
      return 'الملف الشخصي غير موجود.';
    case 'INVALID_SCHEDULE':
      return 'مواعيد الجلسات غير صحيحة.';
    case 'INVALID_TIMEZONE':
      return 'المنطقة الزمنية غير صحيحة.';
    case 'INVALID_EFFECTIVE_DATE':
      return 'تاريخ النفاذ غير صالح.';
    case 'INVALID_SESSIONS':
      return 'قائمة الجلسات غير صالحة.';
    case 'INVALID_START_PAGE':
      return 'رقم الصفحة الابتدائية غير صالح.';
    case 'INVALID_DAILY_PAGES':
      return 'عدد الصفحات اليومية غير صالح.';
    default:
      return 'حدث خطأ داخلي. حاول مرة أخرى.';
  }
};

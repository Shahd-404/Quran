export const dbCodeToMachineCode = (dbMessage: string | null | undefined) => {
  if (!dbMessage) return 'INTERNAL_ERROR'
  const m = dbMessage.toLowerCase()
  if (m.includes('unauthenticated')) return 'UNAUTHENTICATED'
  if (m.includes('profile_not_found')) return 'PROFILE_NOT_FOUND'
  if (m.includes('active_plan_not_found')) return 'ACTIVE_PLAN_NOT_FOUND'
  if (m.includes('active_khatma_not_found')) return 'ACTIVE_KHATMA_NOT_FOUND'
  if (m.includes('plan_not_effective')) return 'PLAN_NOT_EFFECTIVE'
  if (m.includes('invalid_plan_configuration')) return 'INVALID_PLAN_CONFIGURATION'
  if (m.includes('invalid_timezone')) return 'INVALID_TIMEZONE'
  if (m.includes('internal_error')) return 'INTERNAL_ERROR'
  return 'INTERNAL_ERROR'
}

export const codeToArabic = (code: string) => {
  switch (code) {
    case 'ACTIVE_PLAN_NOT_FOUND':
      return 'لا توجد خطة ورد نشطة.'
    case 'ACTIVE_KHATMA_NOT_FOUND':
      return 'لا توجد ختمة نشطة مرتبطة بالخطة.'
    case 'PLAN_NOT_EFFECTIVE':
      return 'ستبدأ خطة الورد في تاريخ لاحق.'
    case 'INVALID_PLAN_CONFIGURATION':
      return 'تكوين الخطة غير صالح.'
    case 'UNAUTHENTICATED':
      return 'يجب تسجيل الدخول أولًا.'
    case 'PROFILE_NOT_FOUND':
      return 'الملف الشخصي غير موجود.'
    default:
      return 'تعذر تجهيز ورد اليوم. حاولي مرة أخرى.'
  }
}

import { NotificationErrorCode } from './types'

export const notificationErrorMessages: Record<NotificationErrorCode, string> = {
  UNAUTHENTICATED: 'يرجى تسجيل الدخول لتعديل تذكيرات الورد.',
  PUSH_UNSUPPORTED: 'هذا المتصفح لا يدعم إشعارات الورد.',
  INSECURE_CONTEXT: 'يلزم فتح الموقع عبر اتصال آمن لتفعيل الإشعارات.',
  VAPID_PUBLIC_KEY_MISSING: 'مفتاح الإشعارات العام غير مضبوط.',
  VAPID_PUBLIC_KEY_INVALID: 'مفتاح الإشعارات العام غير صالح.',
  PERMISSION_DENIED: 'تم منع صلاحية الإشعارات.',
  SERVICE_WORKER_FAILED: 'تعذر تسجيل خدمة الإشعارات.',
  SUBSCRIPTION_FAILED: 'تعذر إنشاء اشتراك الإشعارات.',
  SUBSCRIPTION_SAVE_FAILED: 'تعذر حفظ الاشتراك.',
  SUBSCRIPTION_REMOVE_FAILED: 'لم يكتمل إيقاف التذكيرات. حاول مرة أخرى.',
  INVALID_SUBSCRIPTION: 'بيانات اشتراك الإشعارات غير صالحة.',
  INTERNAL_ERROR: 'حدث خطأ مؤقت. حاول مرة أخرى بعد قليل.',
}

export class QuranConfigurationError extends Error {
  constructor() {
    super('Quran Foundation server configuration is missing or invalid.')
    this.name = 'QuranConfigurationError'
  }
}

export class QuranProviderError extends Error {
  constructor() {
    super('Quran Foundation provider request failed.')
    this.name = 'QuranProviderError'
  }
}

export class QuranMalformedResponseError extends Error {
  constructor() {
    super('Quran Foundation returned a malformed page response.')
    this.name = 'QuranMalformedResponseError'
  }
}

export function getSafeQuranErrorMessage(error: unknown): string {
  if (error instanceof QuranConfigurationError) {
    return 'قارئ القرآن غير مُعدّ بعد. أضف بيانات Quran Foundation في إعدادات الخادم ثم أعد المحاولة.'
  }
  if (error instanceof QuranMalformedResponseError) {
    return 'تعذّر عرض هذه الصفحة لأن بياناتها غير مكتملة. حاول مرة أخرى بعد قليل.'
  }
  return 'تعذّر تحميل صفحة القرآن الآن. يمكنك إعادة المحاولة دون فقد موضع القراءة.'
}

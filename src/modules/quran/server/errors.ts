export type QuranErrorCode =
  | 'QURAN_CONFIGURATION'
  | 'QURAN_INVALID_PAGE_RANGE'
  | 'QURAN_MALFORMED_RESPONSE'
  | 'QURAN_UPSTREAM_UNAUTHORIZED'
  | 'QURAN_UPSTREAM_FORBIDDEN'
  | 'QURAN_UPSTREAM_NOT_FOUND'
  | 'QURAN_UPSTREAM_RATE_LIMITED'
  | 'QURAN_UPSTREAM_SERVER_ERROR'
  | 'QURAN_UPSTREAM_TIMEOUT'
  | 'QURAN_UPSTREAM_REQUEST_FAILED'

const PROVIDER_STATUS_PATTERN =
  /(?:^|\bfailed:\s*)(401|403|404|429|5\d{2})\b/i

export class QuranLoadError extends Error {
  readonly code: QuranErrorCode
  readonly upstreamStatusCode: number | null

  constructor(
    message: string,
    code: QuranErrorCode,
    upstreamStatusCode: number | null = null,
  ) {
    super(message)
    this.name = 'QuranLoadError'
    this.code = code
    this.upstreamStatusCode = upstreamStatusCode
  }
}

export class QuranConfigurationError extends QuranLoadError {
  constructor() {
    super(
      'Quran Foundation server configuration is missing or invalid.',
      'QURAN_CONFIGURATION',
    )
    this.name = 'QuranConfigurationError'
  }
}

export class QuranProviderError extends QuranLoadError {
  constructor(
    code: QuranErrorCode = 'QURAN_UPSTREAM_REQUEST_FAILED',
    upstreamStatusCode: number | null = null,
  ) {
    super(
      'Quran Foundation provider request failed.',
      code,
      upstreamStatusCode,
    )
    this.name = 'QuranProviderError'
  }
}

export class QuranMalformedResponseError extends QuranLoadError {
  constructor() {
    super(
      'Quran Foundation returned a malformed page response.',
      'QURAN_MALFORMED_RESPONSE',
    )
    this.name = 'QuranMalformedResponseError'
  }
}

export class QuranInvalidPageRangeError extends QuranLoadError {
  constructor() {
    super(
      'The Quran page range is invalid.',
      'QURAN_INVALID_PAGE_RANGE',
    )
    this.name = 'QuranInvalidPageRangeError'
  }
}

export class QuranPageRangeLoadError extends QuranLoadError {
  readonly pageNumber: number

  constructor(pageNumber: number, error: QuranLoadError) {
    super(error.message, error.code, error.upstreamStatusCode)
    this.name = 'QuranPageRangeLoadError'
    this.pageNumber = pageNumber
  }
}

function codeForProviderStatus(statusCode: number): QuranErrorCode {
  if (statusCode === 401) return 'QURAN_UPSTREAM_UNAUTHORIZED'
  if (statusCode === 403) return 'QURAN_UPSTREAM_FORBIDDEN'
  if (statusCode === 404) return 'QURAN_UPSTREAM_NOT_FOUND'
  if (statusCode === 429) return 'QURAN_UPSTREAM_RATE_LIMITED'
  if (statusCode >= 500) return 'QURAN_UPSTREAM_SERVER_ERROR'
  return 'QURAN_UPSTREAM_REQUEST_FAILED'
}

export function normalizeQuranLoadError(error: unknown): QuranLoadError {
  if (error instanceof QuranLoadError) return error

  if (error instanceof Error) {
    if (
      error.name === 'AbortError' ||
      /\b(?:timeout|timed out)\b/i.test(error.message)
    ) {
      return new QuranProviderError('QURAN_UPSTREAM_TIMEOUT')
    }

    const statusMatch = error.message.match(PROVIDER_STATUS_PATTERN)
    if (statusMatch) {
      const statusCode = Number(statusMatch[1])
      return new QuranProviderError(
        codeForProviderStatus(statusCode),
        statusCode,
      )
    }
  }

  return new QuranProviderError()
}

export function getSafeQuranErrorMessage(error: unknown): string {
  const normalized = normalizeQuranLoadError(error)

  if (normalized.code === 'QURAN_CONFIGURATION') {
    return 'قارئ القرآن غير مُعدّ بعد. أضف بيانات Quran Foundation في إعدادات الخادم ثم أعد المحاولة.'
  }
  if (normalized.code === 'QURAN_INVALID_PAGE_RANGE') {
    return 'نطاق صفحات جلسة الورد غير صالح. ارجع إلى لوحة الورد وحاول فتح الجلسة مرة أخرى.'
  }
  if (normalized.code === 'QURAN_MALFORMED_RESPONSE') {
    return 'تعذّر عرض صفحات الورد لأن بياناتها غير مكتملة. حاول مرة أخرى بعد قليل.'
  }
  if (normalized.code === 'QURAN_UPSTREAM_NOT_FOUND') {
    return 'تعذّر العثور على إحدى صفحات الورد لدى مزوّد القرآن. حاول مرة أخرى، وتواصل مع الدعم إذا استمرت المشكلة.'
  }
  if (normalized.code === 'QURAN_UPSTREAM_RATE_LIMITED') {
    return 'تعذّر تحميل صفحات القرآن بسبب كثرة الطلبات. انتظر قليلًا ثم أعد المحاولة.'
  }

  return 'تعذّر تحميل صفحات القرآن الآن. يمكنك إعادة المحاولة دون فقد موضع القراءة.'
}

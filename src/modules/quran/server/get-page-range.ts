import { randomUUID } from 'node:crypto'
import { QuranPage } from '../types'
import {
  FIRST_QURAN_PAGE,
  LAST_QURAN_PAGE,
  QCF_V2_MUSHAF_ID,
  QCF_V2_SCHEMA_VERSION,
  isValidQuranPage,
} from '../qcf-v2'
import {
  normalizeQuranLoadError,
  QuranInvalidPageRangeError,
  QuranMalformedResponseError,
  QuranPageRangeLoadError,
} from './errors'
import { getQuranPage } from './get-page'

const PAGE_LOAD_CONCURRENCY = 4

export type QuranLoadFailureLog = {
  operation: 'load_qcf_v2_page'
  correlationId: string
  requestedPage: number
  returnedPage: number | null
  lineCount: number
  errorCode: string
  durationMs: number
}

type QuranPageLoader = (pageNumber: number) => Promise<QuranPage>

type LoadQuranPageRangeOptions = {
  correlationId: string
  loadPage?: QuranPageLoader
  logFailure?: (entry: QuranLoadFailureLog) => void
  now?: () => number
}

function defaultFailureLogger(entry: QuranLoadFailureLog): void {
  console.error(JSON.stringify(entry))
}

export function createQuranCorrelationId(): string {
  return randomUUID()
}

export function getInclusiveQuranPageNumbers(
  startPage: number,
  endPage: number,
): number[] {
  if (
    !isValidQuranPage(startPage) ||
    !isValidQuranPage(endPage) ||
    startPage > endPage
  ) {
    throw new QuranInvalidPageRangeError()
  }

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  )
}

export async function loadQuranPageRange(
  startPage: number,
  endPage: number,
  {
    correlationId,
    loadPage = getQuranPage,
    logFailure = defaultFailureLogger,
    now = Date.now,
  }: LoadQuranPageRangeOptions,
): Promise<QuranPage[]> {
  const startedAt = now()
  let pageNumbers: number[]

  try {
    pageNumbers = getInclusiveQuranPageNumbers(startPage, endPage)
  } catch (error) {
    const normalized = normalizeQuranLoadError(error)
    logFailure({
      operation: 'load_qcf_v2_page',
      correlationId,
      requestedPage: startPage,
      returnedPage: null,
      lineCount: 0,
      errorCode: normalized.code,
      durationMs: Math.max(0, now() - startedAt),
    })
    throw normalized
  }

  const loadedPages: QuranPage[] = []

  for (
    let offset = 0;
    offset < pageNumbers.length;
    offset += PAGE_LOAD_CONCURRENCY
  ) {
    const batch = pageNumbers.slice(offset, offset + PAGE_LOAD_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((pageNumber) =>
        Promise.resolve().then(() => loadPage(pageNumber)),
      ),
    )
    const failedIndex = results.findIndex(
      (result) => result.status === 'rejected',
    )

    if (failedIndex !== -1) {
      const failedResult = results[failedIndex]
      const normalized = normalizeQuranLoadError(
        failedResult.status === 'rejected' ? failedResult.reason : undefined,
      )
      const rangeError = new QuranPageRangeLoadError(
        batch[failedIndex],
        normalized,
      )
      logFailure({
        operation: 'load_qcf_v2_page',
        correlationId,
        requestedPage: rangeError.pageNumber,
        returnedPage: null,
        lineCount: 0,
        errorCode: rangeError.code,
        durationMs: Math.max(0, now() - startedAt),
      })
      throw rangeError
    }

    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return

      const expectedPageNumber = batch[index]
      if (
        result.value.schemaVersion !== QCF_V2_SCHEMA_VERSION ||
        result.value.mushafId !== QCF_V2_MUSHAF_ID ||
        result.value.pageNumber !== expectedPageNumber ||
        result.value.v2Page !== expectedPageNumber ||
        !Array.isArray(result.value.lines) ||
        result.value.lines.length === 0
      ) {
        const rangeError = new QuranPageRangeLoadError(
          expectedPageNumber,
          new QuranMalformedResponseError(),
        )
        logFailure({
          operation: 'load_qcf_v2_page',
          correlationId,
          requestedPage: expectedPageNumber,
          returnedPage: isValidQuranPage(result.value.pageNumber)
            ? result.value.pageNumber
            : null,
          lineCount: Array.isArray(result.value.lines)
            ? result.value.lines.length
            : 0,
          errorCode: rangeError.code,
          durationMs: Math.max(0, now() - startedAt),
        })
        throw rangeError
      }
      loadedPages.push(result.value)
    })
  }

  return loadedPages
}

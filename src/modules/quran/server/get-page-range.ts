import { randomUUID } from 'node:crypto'
import { QuranPage } from '../types'
import {
  normalizeQuranLoadError,
  QuranInvalidPageRangeError,
  QuranMalformedResponseError,
  QuranPageRangeLoadError,
} from './errors'
import { getQuranPage } from './get-page'

const FIRST_QURAN_PAGE = 1
const LAST_QURAN_PAGE = 604
const PAGE_LOAD_CONCURRENCY = 4

export type QuranLoadFailureLog = {
  operation: 'load_quran_page_range'
  correlationId: string
  routeType: 'authenticated_reader'
  startPage: number
  endPage: number
  failingPage: number | null
  upstreamStatusCode: number | null
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

function isValidQuranPage(pageNumber: number): boolean {
  return (
    Number.isInteger(pageNumber) &&
    pageNumber >= FIRST_QURAN_PAGE &&
    pageNumber <= LAST_QURAN_PAGE
  )
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
      operation: 'load_quran_page_range',
      correlationId,
      routeType: 'authenticated_reader',
      startPage,
      endPage,
      failingPage: null,
      upstreamStatusCode: normalized.upstreamStatusCode,
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
        operation: 'load_quran_page_range',
        correlationId,
        routeType: 'authenticated_reader',
        startPage,
        endPage,
        failingPage: rangeError.pageNumber,
        upstreamStatusCode: rangeError.upstreamStatusCode,
        errorCode: rangeError.code,
        durationMs: Math.max(0, now() - startedAt),
      })
      throw rangeError
    }

    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return

      const expectedPageNumber = batch[index]
      if (result.value.pageNumber !== expectedPageNumber) {
        const rangeError = new QuranPageRangeLoadError(
          expectedPageNumber,
          new QuranMalformedResponseError(),
        )
        logFailure({
          operation: 'load_quran_page_range',
          correlationId,
          routeType: 'authenticated_reader',
          startPage,
          endPage,
          failingPage: rangeError.pageNumber,
          upstreamStatusCode: rangeError.upstreamStatusCode,
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

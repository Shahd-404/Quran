import { ReaderSession } from './types'

type PageQuery = string | string[] | undefined

export type ReaderPageSelection = {
  pageNumber: number
  shouldRedirect: boolean
}

export function getDefaultReaderPage(session: ReaderSession): number {
  const lastOpenedPage = session.lastOpenedPage
  if (
    lastOpenedPage !== null &&
    Number.isInteger(lastOpenedPage) &&
    lastOpenedPage >= session.startPage &&
    lastOpenedPage <= session.endPage
  ) {
    return lastOpenedPage
  }
  return session.startPage
}

export function selectReaderPage(
  session: ReaderSession,
  query: PageQuery,
): ReaderPageSelection {
  const defaultPage = getDefaultReaderPage(session)
  if (query === undefined) {
    return { pageNumber: defaultPage, shouldRedirect: false }
  }

  if (Array.isArray(query) || !/^\d+$/.test(query)) {
    return { pageNumber: defaultPage, shouldRedirect: true }
  }

  const requestedPage = Number(query)
  if (!Number.isSafeInteger(requestedPage)) {
    return { pageNumber: defaultPage, shouldRedirect: true }
  }

  if (requestedPage < session.startPage) {
    return { pageNumber: session.startPage, shouldRedirect: true }
  }
  if (requestedPage > session.endPage) {
    return { pageNumber: session.endPage, shouldRedirect: true }
  }
  return { pageNumber: requestedPage, shouldRedirect: false }
}

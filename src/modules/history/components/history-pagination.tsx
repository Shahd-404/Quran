import React from 'react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { HistoryPagination as PaginationModel } from '../types'

function pageHref(basePath: string, page: number): string {
  return page === 1 ? basePath : `${basePath}?page=${page}`
}

export function HistoryPagination({
  pagination,
  basePath,
}: {
  pagination: PaginationModel
  basePath: string
}) {
  if (pagination.totalEvents === 0) return null

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-line pt-5"
      aria-label="صفحات سجل القراءة"
    >
      {pagination.hasPrevious ? (
        <a
          href={pageHref(basePath, pagination.page - 1)}
          className="btn-secondary min-h-[2.75rem] rounded-xl px-4 py-2"
        >
          السابق
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-[2.75rem] items-center rounded-xl border border-line px-4 py-2 font-bold text-muted/50"
        >
          السابق
        </span>
      )}
      <span className="text-sm text-muted">
        صفحة {formatArabicNumber(pagination.page)} من{' '}
        {formatArabicNumber(pagination.totalPages)}
      </span>
      {pagination.hasNext ? (
        <a
          href={pageHref(basePath, pagination.page + 1)}
          className="btn-primary min-h-[2.75rem] rounded-xl px-4 py-2"
        >
          التالي
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-[2.75rem] items-center rounded-xl bg-elevated px-4 py-2 font-bold text-muted/50"
        >
          التالي
        </span>
      )}
    </nav>
  )
}

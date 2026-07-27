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
      className="flex items-center justify-between gap-4 border-t border-stone-200 pt-5"
      aria-label="صفحات سجل القراءة"
    >
      {pagination.hasPrevious ? (
        <a
          href={pageHref(basePath, pagination.page - 1)}
          className="inline-flex min-h-[2.75rem] items-center rounded-xl border border-stone-300 bg-white px-4 py-2 font-bold text-stone-800"
        >
          السابق
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-[2.75rem] items-center rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-400"
        >
          السابق
        </span>
      )}
      <span className="text-sm text-stone-500">
        صفحة {formatArabicNumber(pagination.page)} من{' '}
        {formatArabicNumber(pagination.totalPages)}
      </span>
      {pagination.hasNext ? (
        <a
          href={pageHref(basePath, pagination.page + 1)}
          className="inline-flex min-h-[2.75rem] items-center rounded-xl bg-emerald-900 px-4 py-2 font-bold text-white"
        >
          التالي
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex min-h-[2.75rem] items-center rounded-xl bg-stone-200 px-4 py-2 font-bold text-stone-400"
        >
          التالي
        </span>
      )}
    </nav>
  )
}

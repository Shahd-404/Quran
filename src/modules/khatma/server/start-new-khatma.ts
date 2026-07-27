import { SupabaseClient } from '@supabase/supabase-js'
import {
  mapStartNewKhatmaDatabaseError,
  startNewKhatmaCodeToArabic,
} from './error-mapping'
import {
  StartNewKhatmaErrorCode,
  StartNewKhatmaResult,
} from './types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type RpcError = {
  code?: string
  message?: string
  details?: string
}

type StartRow = {
  plan_id: string
  khatma_id: string
  cycle_number: number
  effective_from: string
}

function failure(code: StartNewKhatmaErrorCode): StartNewKhatmaResult {
  return { success: false, code, message: startNewKhatmaCodeToArabic(code) }
}

function isStartRow(value: unknown): value is StartRow {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.plan_id === 'string' &&
    typeof row.khatma_id === 'string' &&
    Number.isInteger(row.cycle_number) &&
    Number(row.cycle_number) > 0 &&
    typeof row.effective_from === 'string' &&
    DATE_PATTERN.test(row.effective_from)
  )
}

export async function startNewKhatma(
  client: SupabaseClient,
  effectiveFrom: string,
): Promise<StartNewKhatmaResult> {
  if (!DATE_PATTERN.test(effectiveFrom)) {
    return failure('INVALID_EFFECTIVE_DATE')
  }

  const { data, error } = (await client.rpc(
    'start_new_khatma_from_previous_plan',
    { p_effective_from: effectiveFrom },
  )) as { data: unknown; error: RpcError | null }

  if (error) {
    const code = mapStartNewKhatmaDatabaseError(
      `${error.message ?? ''} ${error.details ?? ''}`,
    )
    console.error('[startNewKhatma] RPC failed', {
      databaseCode: error.code ?? 'unknown',
      mappedCode: code,
    })
    return failure(code)
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!isStartRow(row) || row.effective_from !== effectiveFrom) {
    return failure('INTERNAL_ERROR')
  }

  return {
    success: true,
    planId: row.plan_id,
    khatmaId: row.khatma_id,
    cycleNumber: row.cycle_number,
    effectiveFrom: row.effective_from,
  }
}

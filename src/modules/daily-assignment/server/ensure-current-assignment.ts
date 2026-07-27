import { SupabaseClient } from '@supabase/supabase-js'
import { EnsureCurrentAssignmentResult } from './types'
import { dbCodeToMachineCode, codeToArabic } from './error-mapping'

export async function ensureCurrentAssignment(client: SupabaseClient): Promise<EnsureCurrentAssignmentResult> {
  try {
    const { data, error } = await (client as any).rpc('ensure_current_reading_assignment') as any

    if (error) {
      console.error('[ensureCurrentAssignment] RPC error:', { code: error.code, message: error.message, details: error.details })
      const code = dbCodeToMachineCode(error.message || error.details || '')
      return { success: false, code, message: codeToArabic(code) }
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { success: false, code: 'INTERNAL_ERROR', message: codeToArabic('INTERNAL_ERROR') }
    }

    const row = data[0]
    if (!row.assignment_id || !row.local_date) {
      return { success: false, code: 'INTERNAL_ERROR', message: codeToArabic('INTERNAL_ERROR') }
    }

    return {
      success: true,
      assignmentId: row.assignment_id,
      localDate: row.local_date,
      createdNow: !!row.created_now,
      carriedOver: !!row.carried_over,
      targetPages: Number(row.target_pages ?? 0),
      sessionCount: Number(row.session_count ?? 0),
    }
  } catch (err: any) {
    console.error('[ensureCurrentAssignment] Unexpected error:', err)
    return { success: false, code: 'INTERNAL_ERROR', message: codeToArabic('INTERNAL_ERROR') }
  }
}

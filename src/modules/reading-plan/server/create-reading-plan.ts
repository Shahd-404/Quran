import { SupabaseClient } from '@supabase/supabase-js';
import { CreatePlanInput, CreatePlanResult } from './types';
import { validateCreatePlanInput, ValidationError } from './validation';
import { dbCodeToMachineCode, codeToArabic } from './error-mapping';

export async function createReadingPlan(client: SupabaseClient, input: CreatePlanInput): Promise<CreatePlanResult> {
  try {
    // validate locally first
    validateCreatePlanInput(input);
  } catch (e: any) {
    if (e && e.code) {
      return { success: false, code: e.code, message: codeToArabic(e.code) };
    }
    return { success: false, code: 'INVALID_INPUT', message: 'مدخلات غير صالحة' };
  }

  // call RPC
  const rpcParams = {
    p_start_page: input.startPage,
    p_daily_pages: input.dailyPages,
    p_sessions: input.sessions,
    p_timezone: input.timezone,
    p_effective_from: input.effectiveFrom,
  } as const;

  const { data, error } = await client.rpc('create_reading_plan', rpcParams) as any;

  if (error) {
    console.error('[createReadingPlan] RPC failed', { code: error.code || 'UNKNOWN' });
    const code = dbCodeToMachineCode(error.message || error.details || '');
    return { success: false, code, message: codeToArabic(code) };
  }

  // Expect the function to return a row with plan_id and khatma_id
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { success: false, code: 'INTERNAL_ERROR', message: codeToArabic('INTERNAL_ERROR') };
  }

  const row = data[0];
  return { success: true, planId: row.plan_id, khatmaId: row.khatma_id };
}

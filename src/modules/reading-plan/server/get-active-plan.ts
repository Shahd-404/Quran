import { SupabaseClient } from '@supabase/supabase-js'

export async function userHasActiveReadingPlan(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client
    .from('reading_plans')
    .select('id')
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? 'Failed to check active reading plan')
  }

  return data !== null
}

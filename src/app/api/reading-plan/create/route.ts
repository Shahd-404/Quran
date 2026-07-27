import { createReadingPlanApi } from '@/modules/reading-plan/onboarding/action'
import { mutationGuardResponse } from '@/lib/security/request-guards'

export async function POST(req: Request) {
  const rejected = mutationGuardResponse(req, { requireJson: true, maxBytes: 16_384 })
  if (rejected) return rejected
  return await createReadingPlanApi(req)
}

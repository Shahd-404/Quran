export type OnboardingStep = 1 | 2 | 3 | 4 | 5

export type PlanSessionTime = string

export type OnboardingFormValues = {
  startPage: number
  dailyPages: number
  sessionsCount: number
  sessionTimes: PlanSessionTime[]
  timezone: string
  effectiveFrom: string
}

export type OnboardingFormProps = {
  actionUrl: string
}

export type CreateReadingPlanPayload = {
  startPage: number
  dailyPages: number
  sessions: { sessionOrder: number; scheduledTime: string }[]
  timezone: string
  effectiveFrom: string
}

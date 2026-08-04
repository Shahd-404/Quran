export type SessionCompletionErrorCode =
  | 'UNAUTHENTICATED'
  | 'OFFLINE_ACTION_INVALID'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_OWNERSHIP_INVALID'
  | 'INVALID_SESSION_STATE'
  | 'PLAN_NOT_FOUND'
  | 'KHATMA_NOT_FOUND'
  | 'INVALID_PROGRESS_CONFIGURATION'
  | 'INTERNAL_ERROR'

export type SessionCompletionSuccess = {
  success: true
  sessionId: string
  sessionCompleted: true
  assignmentCompleted: boolean
  khatmaCompleted: boolean
  planCompleted: boolean
  currentUnreadPage: number
  alreadyCompleted: boolean
}

export type SessionCompletionFailure = {
  success: false
  code: SessionCompletionErrorCode
  message: string
}

export type CompleteReadingSessionResult =
  | SessionCompletionSuccess
  | SessionCompletionFailure

export type OfflineCompletionAction = {
  idempotencyKey: string
  occurredAt: string
}

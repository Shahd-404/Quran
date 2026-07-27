export type EnsureCurrentAssignmentSuccess = {
  success: true
  assignmentId: string
  localDate: string
  createdNow: boolean
  carriedOver: boolean
  targetPages: number
  sessionCount: number
}

export type EnsureCurrentAssignmentFailure = {
  success: false
  code: string
  message: string
}

export type EnsureCurrentAssignmentResult = EnsureCurrentAssignmentSuccess | EnsureCurrentAssignmentFailure

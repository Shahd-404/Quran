export type ReaderPersistedStatus = 'pending' | 'in_progress' | 'completed'

export type ReaderSession = {
  id: string
  assignmentId: string
  planId: string
  sessionOrder: number
  startPage: number
  endPage: number
  status: ReaderPersistedStatus
  lastOpenedPage: number | null
  firstOpenedAt: string | null
  lastOpenedAt: string | null
  assignmentDate: string
  assignmentStatus: 'pending' | 'in_progress' | 'completed'
  currentUnreadPage: number
}

export type ReaderSessionResult =
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'success'; session: ReaderSession }

export type NotificationErrorCode =
  | 'UNAUTHENTICATED' | 'PUSH_UNSUPPORTED' | 'INSECURE_CONTEXT'
  | 'VAPID_PUBLIC_KEY_MISSING' | 'VAPID_PUBLIC_KEY_INVALID' | 'PERMISSION_DENIED'
  | 'SERVICE_WORKER_FAILED' | 'SUBSCRIPTION_FAILED'
  | 'SUBSCRIPTION_SAVE_FAILED' | 'SUBSCRIPTION_REMOVE_FAILED'
  | 'INVALID_SUBSCRIPTION' | 'INTERNAL_ERROR'

export type PushState = 'unsupported' | 'default' | 'denied' | 'subscribed' | 'unsubscribed'

export interface SerializedPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

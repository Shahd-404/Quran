import { MobileBottomNavigation } from '@/components/mobile-bottom-navigation'
import { ConnectivityNotice } from '@/modules/offline/components/connectivity-notice'
import { PwaControls } from '@/modules/pwa/components/pwa-controls'
import { NativeReminderBridgeRuntime } from '@/modules/notifications/native/native-reminder-runtime'

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConnectivityNotice />
      <PwaControls />
      <NativeReminderBridgeRuntime />
      {children}
      <MobileBottomNavigation />
    </>
  )
}

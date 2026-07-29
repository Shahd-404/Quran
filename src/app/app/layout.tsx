import { MobileBottomNavigation } from '@/components/mobile-bottom-navigation'
import { ConnectivityNotice } from '@/modules/offline/components/connectivity-notice'
import { PwaControls } from '@/modules/pwa/components/pwa-controls'

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConnectivityNotice />
      <PwaControls />
      {children}
      <MobileBottomNavigation />
    </>
  )
}

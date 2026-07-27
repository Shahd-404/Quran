import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'ورد', template: '%s | ورد' },
  description: 'تطبيق لتنظيم ومتابعة ورد القرآن اليومي',
  applicationName: 'ورد',
  manifest: '/manifest.webmanifest',
  themeColor: '#064e3b',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  appleWebApp: {
    capable: true,
    title: 'ورد',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/wird-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icons/wird-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: '/icons/wird-192.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}

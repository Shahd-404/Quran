import './globals.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ThemeScript } from '@/components/theme/theme-script'

const alexandria = localFont({
  src: '../../public/fonts/Alexandria-Variable.ttf',
  weight: '100 900',
  style: 'normal',
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['IBM Plex Sans Arabic', 'Cairo', 'Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  title: { default: 'ورد', template: '%s | ورد' },
  description: 'تطبيق لتنظيم ومتابعة ورد القرآن اليومي',
  applicationName: 'ورد',
  manifest: '/manifest.webmanifest',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f6f0' },
    { media: '(prefers-color-scheme: dark)', color: '#111513' },
  ],
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
    <html lang="ar" dir="rtl" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <ThemeScript />
      </head>
      <body className={alexandria.variable}>
        <a
          href="#main-content"
          className="fixed right-4 top-3 z-[60] -translate-y-20 rounded-xl bg-primary px-4 py-2 font-semibold text-white transition focus:translate-y-0"
        >
          الانتقال إلى المحتوى
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <div id="main-content" className="flex-1">
            {children}
          </div>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}

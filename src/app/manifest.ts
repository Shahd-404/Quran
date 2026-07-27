import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ورد — رفيقك للورد اليومي',
    short_name: 'ورد',
    description: 'تطبيق لتنظيم ومتابعة ورد القرآن اليومي',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f6f2',
    theme_color: '#064e3b',
    orientation: 'any',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      { src: '/icons/wird-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/wird-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/wird-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}

import './globals.css'

export const metadata = {
  title: 'ورد',
  description: 'مساعد لتنظيم ومتابعة الورد اليومي من القرآن الكريم'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}

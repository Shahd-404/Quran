import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { refreshSession } from './lib/supabase/proxy'

const PUBLIC_FILE = /\.(.*)$/

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Skip internal next paths and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || PUBLIC_FILE.test(pathname) || pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  try {
    const { user } = await refreshSession(req as any, res as any)

    // Protect /app
    if (pathname.startsWith('/app')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Redirect authenticated users away from auth pages
    if ((pathname === '/login' || pathname === '/register') && user) {
      return NextResponse.redirect(new URL('/app', req.url))
    }
  } catch (e) {
    const token = req.cookies.get('sb-access-token') || req.cookies.get('supabase-auth-token')
    if (pathname.startsWith('/app') && !token) return NextResponse.redirect(new URL('/login', req.url))
    if ((pathname === '/login' || pathname === '/register') && token) return NextResponse.redirect(new URL('/app', req.url))
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/login', '/register']
}

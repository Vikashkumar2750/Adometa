import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that require no authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/contact',
  '/blog',
  '/privacy',
  '/terms',
  '/refunds',
  '/disclaimer',
  '/sitemap.xml',
  '/robots.txt',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // 1. Fully public paths — always allow
  if (isPublicPath(pathname)) {
    // If already logged in and visiting login/register, redirect based on role
    if ((pathname === '/login' || pathname === '/register') && token) {
      try {
        const payloadB64 = token.split('.')[1];
        const payload = JSON.parse(
          Buffer.from(payloadB64, 'base64').toString('utf8')
        );
        // SUPER_ADMIN → admin panel; tenant users → dashboard
        if (payload.role === 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      } catch {
        // Malformed token — fall through to /dashboard
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 2. Protect /admin and /dashboard — redirect to /login if not authenticated
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static / _next/image (Next.js internals)
     * - favicon.ico
     * - static file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js)).*)',
  ],
}

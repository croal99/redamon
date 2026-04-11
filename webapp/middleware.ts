import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png'
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('bluenet_token')?.value
  const isAuthRoute = pathname === '/login' || pathname === '/logout'

  if (token && pathname === '/login') {
    const url = req.nextUrl.clone()
    url.pathname = '/home'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!token && !isAuthRoute) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${pathname}${search || ''}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.png).*)'],
}


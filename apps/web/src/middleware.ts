import { NextRequest, NextResponse } from 'next/server';

/** Unauthenticated page requests go to sign-in. This is UX only – the API enforces access. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') return NextResponse.next();
  if (!req.cookies.get('bml_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };

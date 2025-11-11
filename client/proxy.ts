import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function decodeRole(token?: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
    const decoded = typeof atob === 'function' ? atob(b64 + pad) : '';
    const payload = decoded ? JSON.parse(decoded) : {};
    const raw = (payload.role || '').toString();
    const norm = raw.replace(/[^a-z]/gi, '').toLowerCase();
    if (norm === 'admin') return 'admin';
    if (norm === 'officeadmin' || norm === 'office') return 'officeAdmin';
    if (norm === 'showroom' || norm === 'customer') return 'showroom';
    return raw || null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  const { pathname } = req.nextUrl

  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/office-admin') ||
    pathname.startsWith('/showroom-account')

  // If protected and unauthenticated -> login
  if (isProtected && !token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Role-based routing
  if (token) {
    const role = decodeRole(token)
    const wantAdmin = pathname.startsWith('/admin')
    const wantOffice = pathname.startsWith('/office-admin')
    const wantShowroom = pathname.startsWith('/showroom-account')

    const redirectToRoleHome = () => {
      const url = req.nextUrl.clone()
      if (role === 'admin') url.pathname = '/admin'
      else if (role === 'officeAdmin') url.pathname = '/office-admin'
      else if (role === 'showroom') url.pathname = '/showroom-account'
      else url.pathname = '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (wantAdmin && role !== 'admin') return redirectToRoleHome()
    if (wantOffice && role !== 'officeAdmin') return redirectToRoleHome()
    if (wantShowroom && role !== 'showroom') return redirectToRoleHome()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/office-admin/:path*',
    '/showroom-account/:path*',
  ],
}

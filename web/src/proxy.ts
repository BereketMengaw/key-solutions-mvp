import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safe-next';
import { refreshSession } from '@/lib/supabase/proxy';

/** Pages that need a signed-in user. Roles are checked on the server in app/(app)/layout.tsx. */
const PROTECTED = ['/stock', '/dashboard', '/menu'];

export async function proxy(request: NextRequest) {
  const { response, userId } = await refreshSession(request);
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!userId && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    const next = safeNext(pathname + search);
    if (next) url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Every page, not static files or images.
  matcher: ['/((?!_next/static|_next/image|icon.png|mark.svg|favicon.ico).*)'],
};

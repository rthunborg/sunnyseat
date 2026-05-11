import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

// `dev` is excluded from the negative lookahead so /dev/* bypasses locale
// routing (Story 1.2 — the dev-only state-forcing demo must not be locale-prefixed).
export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|dev|.*\\..*).*)',
};

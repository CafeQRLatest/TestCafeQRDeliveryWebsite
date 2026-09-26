// middleware.js (Next.js App Router — runs at the Edge before every matched request)
//
// PURPOSE:
//   1. Zero-Effort Smart Redirect (Method 1):
//      Automatically forwards any legacy traffic hitting the production Vercel deployment
//      (cafeqr-delivery-website.vercel.app) to the new Cloudflare Pages deployment
//      (https://cafeqr-delivery-website.pages.dev) via HTTP 308, preserving 100% of pathname
//      and query parameters (?r=, ?t=, ?orgId=, clean slugs, etc.).
//      Test domains (e.g. test-cafe-qr-delivery-website.vercel.app) are unaffected.
//   2. Protect delivery-customer routes:
//      Any request to /order, /checkout, or /track that does NOT carry a valid delivery_session cookie
//      is redirected to the login page (/) with restaurant context preserved.

import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';

export async function middleware(req) {
  const host = req.headers.get('host') || '';

  // ── Step 1: Zero-Effort Smart Redirect (Method 1) ──────────────────────────
  // Only redirect requests hitting the production Vercel domain
  if (host.includes('cafeqr-delivery-website.vercel.app')) {
    const targetOrigin =
      process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_URL ||
      'https://cafeqr-delivery-website.pages.dev';
    const targetUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, targetOrigin);
    return NextResponse.redirect(targetUrl, 308);
  }

  // ── Step 2: Customer Route Auth Guard ───────────────────────────────────────
  const pathname = req.nextUrl.pathname;
  const isCustomerRoute =
    pathname.startsWith('/order') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/track');

  if (isCustomerRoute) {
    const session = await getSessionFromCookies(req.cookies);

    if (!session) {
      // Preserve ?r=, ?t=, and ?orgId= so the login page knows the restaurant context
      const { searchParams } = req.nextUrl;
      const r = searchParams.get('r') || '';
      const t = searchParams.get('t') || 'DELIVERY';
      const orgId = searchParams.get('orgId') || searchParams.get('branchId') || '';

      const loginUrl = new URL('/', req.url);
      if (r) loginUrl.searchParams.set('r', r);
      loginUrl.searchParams.set('t', t);
      if (orgId) loginUrl.searchParams.set('orgId', orgId);

      return NextResponse.redirect(loginUrl);
    }
  }

  // Session valid or public route (/, /:slug, /:slug/:branch, /api/**)
  return NextResponse.next();
}

// Match all routes except Next.js internals, images, and static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

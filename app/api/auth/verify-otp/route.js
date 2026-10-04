// app/api/auth/verify-otp/route.js  (App Router)
// Thin proxy → POST /api/v1/auth/customer/verify-otp on the Spring Boot backend.
//
// The backend verifies the OTP against Redis and returns { verified, email }.
// On success, this route issues a signed HttpOnly delivery_session cookie
// (HMAC-SHA256 via INTERNAL_API_SECRET) so the browser stays authenticated.
//
// Request  body: { email, otp, name?, phone? }
// Response 200:  { verified: true, email, name, phone }  + Set-Cookie
// Response 4xx:  { error: string }

export const runtime = 'edge';

import { NextResponse } from 'next/server';

const SESSION_TTL_DAYS = 7;
const SESSION_COOKIE = 'delivery_session';

async function buildSessionToken({ email, name = '', phone = '' }) {
  const payloadStr = JSON.stringify({ email, name, phone, iat: Date.now() });
  const payload = btoa(unescape(encodeURIComponent(payloadStr))).replace(/=/g, '');

  const secret = process.env.INTERNAL_API_SECRET || 'dev-secret-change-me';
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const sig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${payload}.${sig}`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, otp, name = '', phone = '', clientId = null, orgId = null } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'https://cafe-qr-backend.onrender.com/api';

    const upstream = await fetch(`${backendUrl}/v1/auth/customer/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, clientId, orgId, name, phone }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Verification failed (${upstream.status})`;
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    // ── OTP verified — issue session cookie ──────────────────────────────────
    const resolvedCustomer = data?.data || {};
    const resolvedName = resolvedCustomer.name || name || '';
    const resolvedPhone = resolvedCustomer.phone || phone || '';
    const resolvedAddress = resolvedCustomer.address || '';
    const resolvedCustomerId = resolvedCustomer.customerId || null;
    const resolvedEmail = resolvedCustomer.email || email;

    const token = await buildSessionToken({
      email: resolvedEmail,
      name: resolvedName,
      phone: resolvedPhone,
    });

    const response = NextResponse.json({
      verified: true,
      email: resolvedEmail,
      name: resolvedName,
      phone: resolvedPhone,
      address: resolvedAddress,
      customerId: resolvedCustomerId,
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.APP_ENV !== 'development',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('[verify-otp proxy]', err.message);
    return NextResponse.json(
      { error: 'Could not reach authentication server. Please try again.' },
      { status: 502 }
    );
  }
}

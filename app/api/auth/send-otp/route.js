// app/api/auth/send-otp/route.js  (App Router)
// Thin proxy → POST /api/v1/auth/send-otp on the Spring Boot backend.
//
// The backend owns OTP generation, Redis storage, and SMTP email dispatch.
// This route has ZERO email credentials — it simply forwards the request.
//
// Request  body: { email: string }
// Response 200:  { success: true, message: string }
// Response 4xx:  { error: string }

import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'https://cafe-qr-backend.onrender.com/api';

    const upstream = await fetch(`${backendUrl}/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Backend returned ${upstream.status}`;
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    return NextResponse.json({ success: true, message: data?.data || 'OTP sent' });
  } catch (err) {
    console.error('[send-otp proxy]', err.message);
    return NextResponse.json(
      { error: 'Could not reach authentication server. Please try again.' },
      { status: 502 }
    );
  }
}

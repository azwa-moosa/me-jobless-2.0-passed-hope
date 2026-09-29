import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, IS_PROD, SESSION_COOKIE } from '@/lib/server-config';

/** DEV sign-in via mock IdP persona. In UAT/PROD this is replaced by the Entra ID OIDC flow (PLT-001). */
export async function POST(req: NextRequest) {
  if (req.headers.get('x-requested-with') !== 'bml-web') return NextResponse.json({ title: 'Forbidden' }, { status: 403 });
  const { upn } = await req.json().catch(() => ({ upn: '' }));
  const r = await fetch(`${API_BASE_URL}/auth/dev-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upn }) });
  if (!r.ok) return NextResponse.json(await r.json().catch(() => ({ title: 'Sign-in failed' })), { status: r.status });
  const { token, expiresIn } = await r.json();
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: IS_PROD, path: '/', maxAge: expiresIn });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get('x-requested-with') !== 'bml-web') return NextResponse.json({ title: 'Forbidden' }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

/**
 * Backend-for-frontend proxy. The browser never holds the access token: it lives in an httpOnly,
 * SameSite=Strict cookie and is attached here as a Bearer token. Mutating requests also require a
 * custom header (CSRF defence in depth). All authorisation decisions are made by the API.
 */
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, SESSION_COOKIE } from '@/lib/server-config';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (req.method !== 'GET' && req.headers.get('x-requested-with') !== 'bml-web') {
    return NextResponse.json({ title: 'Forbidden', status: 403, detail: 'Missing CSRF header' }, { status: 403 });
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const corr = req.headers.get('x-correlation-id');
  if (corr) headers['x-correlation-id'] = corr;

  const url = `${API_BASE_URL}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(), cache: 'no-store' });
  } catch {
    return NextResponse.json({ title: 'API unavailable', status: 502, detail: 'The platform API is not reachable. Is it running?' }, { status: 502 });
  }
  const body = upstream.status === 204 ? null : await upstream.text();
  const res = new NextResponse(body, { status: upstream.status });
  res.headers.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
  const cid = upstream.headers.get('x-correlation-id');
  if (cid) res.headers.set('x-correlation-id', cid);
  res.headers.set('cache-control', 'no-store');
  return res;
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };

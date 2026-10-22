import { createHash, createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const normalizeApiBase = (rawUrl: string) => {
  const url = new URL(rawUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('Invalid ERP API base URL');
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('ERP API base URL must use HTTPS');
  const rootPath = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '').replace(/\/api(?:\/v1)?$/i, '');
  url.pathname = `${rootPath}/api/v1`;
  return url;
};

const apiBase = () => normalizeApiBase(
  process.env.ERP_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.luxygalleria.com/api/v1',
);

const isAllowedRequest = (method: string, pathname: string) => {
  if (method === 'GET') return /^\/api\/v1\/erp\/(?:items(?:\/[^/]+)?|orders(?:\/[^/]+)?)$/.test(pathname);
  if (method === 'POST') return /^\/api\/v1\/erp\/(?:items|images|webhooks\/order-status)$/.test(pathname);
  if (method === 'PUT') return /^\/api\/v1\/erp\/stock\/[^/]+$/.test(pathname);
  if (method === 'PATCH') return /^\/api\/v1\/erp\/items\/[^/]+$/.test(pathname);
  return false;
};

const jsonError = (status: number, message: string, code: string) =>
  NextResponse.json({ success: false, message, errors: [{ code }] }, { status, headers: { 'Cache-Control': 'no-store' } });

class RequestTooLargeError extends Error {}

const readLimitedBody = async (request: NextRequest, limit: number) => {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new RequestTooLargeError('ERP request body is too large');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
};

const getBodyAndForwardHeaders = async (request: NextRequest, method: string) => {
  const headers = new Headers({ accept: 'application/json' });
  if (method === 'GET') return { body: undefined, signedBody: Buffer.alloc(0), headers };

  const contentType = request.headers.get('content-type') || '';
  if (method === 'POST' && request.nextUrl.pathname === '/api/erp/images') {
    let form: FormData;
    try {
      const multipartBody = await readLimitedBody(request, 15 * 1024 * 1024 + 64 * 1024);
      form = await new Request(request.url, { method: 'POST', headers: { 'content-type': contentType }, body: multipartBody }).formData();
    } catch (error) {
      if (error instanceof RequestTooLargeError) throw error;
      throw new Error('Send one image as multipart form data');
    }
    const entries = Array.from(form.entries());
    const file = form.get('image');
    if (entries.length !== 1 || !(file instanceof File)) throw new Error('Send exactly one file in the image field');
    if (file.size > 15 * 1024 * 1024) throw new Error('Image must be 15 MB or smaller');

    const forwardForm = new FormData();
    forwardForm.append('image', file, file.name);
    return { body: forwardForm, signedBody: Buffer.from(await file.arrayBuffer()), headers };
  }

  if (!contentType.toLowerCase().startsWith('application/json')) throw new Error('ERP request body must use application/json');
  const body = await readLimitedBody(request, 1024 * 1024);
  headers.set('content-type', contentType);
  return { body, signedBody: body, headers };
};

const proxyErpRequest = async (request: NextRequest) => {
  const method = request.method.toUpperCase();
  const upstream = apiBase();
  const localPrefix = '/api/erp';
  if (!request.nextUrl.pathname.startsWith(`${localPrefix}/`)) return jsonError(404, 'ERP endpoint not found', 'NOT_FOUND');
  const routeSuffix = request.nextUrl.pathname.slice(localPrefix.length);
  const upstreamPath = `${upstream.pathname}/erp${routeSuffix}`.replace(/\/{2,}/g, '/');
  if (!isAllowedRequest(method, upstreamPath)) return jsonError(404, 'ERP endpoint not found', 'NOT_FOUND');

  const contentLength = Number(request.headers.get('content-length') || 0);
  const maxRequestBytes = method === 'POST' && upstreamPath === `${upstream.pathname}/erp/images` ? 16 * 1024 * 1024 : 1024 * 1024;
  if (contentLength > maxRequestBytes) return jsonError(413, 'ERP request body is too large', 'PAYLOAD_TOO_LARGE');

  if (method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== request.nextUrl.host) return jsonError(403, 'Cross-origin ERP requests are not allowed', 'FORBIDDEN');
      } catch {
        return jsonError(403, 'Invalid request origin', 'FORBIDDEN');
      }
    }
  }

  const token = request.cookies.get('adminToken')?.value;
  if (!token) return jsonError(401, 'Admin session required', 'UNAUTHENTICATED');

  const base = apiBase();
  const authorization = `Bearer ${token}`;
  const profileResponse = await fetch(new URL(`${base.pathname}/users/profile`, base.origin), {
    headers: { authorization },
    cache: 'no-store',
  });
  if (!profileResponse.ok) return jsonError(profileResponse.status === 401 ? 401 : 403, 'Admin session is not valid', 'UNAUTHENTICATED');
  const profile = await profileResponse.json();
  if (!['admin', 'superadmin'].includes(profile?.data?.role)) return jsonError(403, 'Admin role required', 'FORBIDDEN');

  const keyId = process.env.ERP_KEY_ID;
  const secret = process.env.ERP_SECRET;
  if (!keyId || !secret || secret.trim().length < 32) return jsonError(503, 'ERP signing is not configured on this server', 'UNAVAILABLE');

  let requestData: Awaited<ReturnType<typeof getBodyAndForwardHeaders>>;
  try {
    requestData = await getBodyAndForwardHeaders(request, method);
  } catch (error) {
    if (error instanceof RequestTooLargeError) return jsonError(413, error.message, 'PAYLOAD_TOO_LARGE');
    return jsonError(400, error instanceof Error ? error.message : 'Invalid ERP request body', 'VALIDATION_ERROR');
  }

  const target = new URL(`${upstreamPath}${request.nextUrl.search}`, upstream.origin);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = createHash('sha256').update(requestData.signedBody).digest('hex');
  const stringToSign = `${timestamp}.${method}.${target.pathname}${target.search}.${bodyHash}`;
  const signature = createHmac('sha256', secret.trim()).update(stringToSign).digest('hex');
  requestData.headers.set('X-ERP-Key-Id', keyId.trim());
  requestData.headers.set('X-ERP-Timestamp', timestamp);
  requestData.headers.set('X-ERP-Signature', signature);

  const response = await fetch(target, {
    method,
    headers: requestData.headers,
    body: requestData.body,
    cache: 'no-store',
  });
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

export const GET = proxyErpRequest;
export const POST = proxyErpRequest;
export const PUT = proxyErpRequest;
export const PATCH = proxyErpRequest;
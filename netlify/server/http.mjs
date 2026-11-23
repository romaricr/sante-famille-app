export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const headers = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' blob:",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'geolocation=(), microphone=()',
};

export function json(data, status = 200, cookies = []) {
  const response = Response.json(data, { status, headers });
  for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
  return response;
}

export async function boundedBody(request, maximum) {
  if (Number(request.headers.get('content-length')) > maximum) throw new HttpError(413, 'Le fichier ou la requête dépasse la taille autorisée.');
  if (!request.body) throw new HttpError(400, 'La requête est vide.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new HttpError(413, 'Le fichier ou la requête dépasse la taille autorisée.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

export async function readJSON(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Format de requête non pris en charge.');
  const body = await boundedBody(request, 8192);
  try {
    const data = JSON.parse(body.toString('utf8'));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {}
  throw new HttpError(400, 'La requête ne peut pas être lue.');
}

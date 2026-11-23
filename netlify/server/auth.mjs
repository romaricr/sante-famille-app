import { createHash, randomBytes } from 'node:crypto';
import { getIdentityConfig, verifyRequestOrigin } from '@netlify/identity';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { database } from '../../db/index.ts';
import { rateLimits, sessions } from '../../db/schema.ts';
import { HttpError, json, readJSON } from './http.mjs';

const names = { family: '__Host-sante-family', admin: '__Host-sante-admin' };
const digest = (value) => createHash('sha256').update(value).digest('hex');
const cookie = (kind, value = '', age = 0) => `${names[kind]}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;

export function deployment(request, context) {
  const hostname = new URL(request.url).hostname;
  const stage = context?.deploy?.context ?? process.env.CONTEXT;
  const primary = context?.site?.url ?? process.env.URL;
  const primaryHost = primary ? new URL(primary).hostname : '';
  return stage === 'production' || (!stage && primaryHost === hostname) ? 'production' : `preview-${hostname}`;
}

export function requireSameOrigin(request) {
  try {
    verifyRequestOrigin(request);
  } catch {
    throw new HttpError(403, 'Cette requête ne provient pas de Santé Famille.');
  }
}

function readCookie(request, kind) {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${names[kind]}=`))?.slice(names[kind].length + 1);
}

function hasRole(user, kind) {
  const role = kind === 'family' ? 'famille' : 'admin';
  const roles = user?.app_metadata?.roles;
  const scopedRoles = user?.app_metadata?.authorization?.roles;
  return typeof user?.id === 'string' && ((Array.isArray(roles) && roles.includes(role)) || (Array.isArray(scopedRoles) && scopedRoles.includes(role)));
}

const identityUnavailable = () => new HttpError(503, 'Le service de connexion est momentanément indisponible.');

async function identity(context, path, options = {}) {
  const site = context?.site?.url ?? process.env.URL;
  const base = site ? new URL('/.netlify/identity/', site) : getIdentityConfig()?.url;
  if (!base) throw identityUnavailable();
  let response;
  try {
    const endpoint = new URL(path, `${String(base).replace(/\/$/, '')}/`);
    if (!['localhost', '127.0.0.1'].includes(endpoint.hostname)) endpoint.protocol = 'https:';
    response = await fetch(endpoint, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw identityUnavailable();
  }
  if (response.status === 429) throw new HttpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  if ([401, 403].includes(response.status) && response.headers.get('content-type')?.startsWith('text/html')) {
    throw new HttpError(503, 'La protection du site Netlify bloque le service de connexion. Contactez l’administrateur.');
  }
  const rejected = [400, 401, 403, 422].includes(response.status);
  if (!response.ok && !rejected) throw identityUnavailable();
  const result = await response.json().catch(() => null);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw identityUnavailable();
  return rejected ? null : result;
}

const identityUser = (context, token) => identity(context, 'user', { headers: { Authorization: `Bearer ${token}` } });

export async function getSession(request, context, space, kind, family = null) {
  const value = readCookie(request, kind);
  if (!value || !/^[\w-]{32}~[\w.-]{32,3500}$/.test(value)) return null;
  const hash = digest(value);
  const [session] = await database().select({ tokenHash: sessions.tokenHash }).from(sessions).where(and(
    eq(sessions.space, space), eq(sessions.tokenHash, hash), gt(sessions.expiresAt, new Date()),
    family ? eq(sessions.familyHash, family.hash) : isNull(sessions.familyHash),
  )).limit(1);
  if (!session) return null;
  const user = await identityUser(context, value.split('~')[1]);
  return hasRole(user, kind) ? { user, hash } : null;
}

export async function throttle(key, limit, message = 'Trop de tentatives. Réessayez dans un quart d’heure.') {
  const scope = digest(key);
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const [result] = await database().insert(rateLimits).values({ scope, attempts: 1, expiresAt }).onConflictDoUpdate({
    target: rateLimits.scope,
    set: {
      attempts: sql`case when ${rateLimits.expiresAt} <= now() then 1 else least(${rateLimits.attempts} + 1, ${limit + 1}) end`,
      expiresAt: sql`case when ${rateLimits.expiresAt} <= now() then excluded.expires_at else ${rateLimits.expiresAt} end`,
    },
  }).returning({ attempts: rateLimits.attempts });
  if (result.attempts > limit) throw new HttpError(429, message);
}

export async function login(request, context, space, kind, family = null) {
  const { email, password, inviteToken } = await readJSON(request);
  const isInvite = kind === 'family' && typeof inviteToken === 'string';
  const identifier = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (typeof password !== 'string' || password.length < (isInvite ? 12 : 1) || password.length > 256
    || (isInvite ? !/^[\w.-]{8,512}$/.test(inviteToken) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) || identifier.length > 254)) {
    throw new HttpError(400, isInvite ? 'Vérifiez le lien d’invitation et choisissez au moins 12 caractères.' : 'Renseignez une adresse e-mail et un mot de passe valides.');
  }
  const now = new Date();
  await throttle(`${kind}:ip:${context?.ip || 'unknown'}`, kind === 'admin' ? 8 : 24);
  await throttle(`${kind}:account:${isInvite ? inviteToken : identifier}`, kind === 'admin' ? 5 : 10);
  await Promise.all([
    database().delete(rateLimits).where(lt(rateLimits.expiresAt, now)),
    database().delete(sessions).where(lt(sessions.expiresAt, now)),
  ]);

  const grant = isInvite ? await identity(context, 'verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'signup', token: inviteToken, password }),
  }) : await identity(context, 'token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', username: identifier, password }),
  });
  if (!grant) {
    throw new HttpError(401, isInvite ? 'Impossible d’accepter cette invitation. Utilisez le dernier lien reçu et vérifiez votre mot de passe, ou contactez l’administrateur.' : 'Adresse e-mail ou mot de passe incorrect.');
  }
  if (typeof grant.access_token !== 'string' || !/^[\w.-]{32,3500}$/.test(grant.access_token)) throw identityUnavailable();
  const user = await identityUser(context, grant.access_token);
  if (!hasRole(user, kind)) {
    if (isInvite && user?.id) return json({ accepted: true });
    throw new HttpError(403, kind === 'admin' ? 'Ce compte n’a pas accès à l’espace administrateur.' : 'Ce compte n’a pas accès à l’espace familial.');
  }
  const ttl = Math.min(kind === 'admin' ? 900 : 2700, Number(grant.expires_in) || 900);
  const value = `${randomBytes(24).toString('base64url')}~${grant.access_token}`;
  await database().insert(sessions).values({
    tokenHash: digest(value), familyHash: family?.hash ?? null, space, expiresAt: new Date(Date.now() + ttl * 1000),
  });
  return json({ next: kind === 'admin' ? '/admin-locations.html' : '/' }, 200,
    kind === 'admin' ? [cookie(kind, value, ttl)] : [cookie(kind, value, ttl), cookie('admin')]);
}

export async function logout(request, space, kind) {
  const value = readCookie(request, kind);
  if (value) {
    const hash = digest(value);
    await database().delete(sessions).where(and(eq(sessions.space, space),
      kind === 'admin' ? eq(sessions.tokenHash, hash) : or(eq(sessions.tokenHash, hash), eq(sessions.familyHash, hash))));
  }
  return json({ next: '/' }, 200, kind === 'admin' ? [cookie(kind)] : [cookie('family'), cookie('admin')]);
}

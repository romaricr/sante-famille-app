import { analyzeReceipt } from './analysis.mjs';
import { deployment, getSession, login, logout, requireSameOrigin } from './auth.mjs';
import { expenseRoute, overview, preferences } from './expenses.mjs';
import { headers, HttpError, json } from './http.mjs';
import { render } from './views.mjs';

const html = (view) => new Response(render(view), { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
const isFamilyPath = (path) => ['/', '/index.html', '/index'].includes(path);
const isAdminPath = (path) => ['/admin-locations.html', '/admin-locations'].includes(path);
const unsigned = () => new HttpError(401, 'Connectez-vous à votre espace familial pour continuer.');

async function handle(request, context) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const space = deployment(request, context);
  const method = request.method;
  if ((method === 'GET' || method === 'HEAD') && (isFamilyPath(path) || isAdminPath(path))) {
    const family = await getSession(request, context, space, 'family');
    if (isFamilyPath(path)) return html(family ? 'family' : 'login');
    if (!family) return new Response(null, { status: 303, headers: { ...headers, Location: '/' } });
    return html(await getSession(request, context, space, 'admin', family) ? 'admin' : 'locked');
  }
  if (!path.startsWith('/api/')) throw new HttpError(404, 'Page introuvable.');
  if (method !== 'GET' && method !== 'HEAD') requireSameOrigin(request);
  if (method === 'POST' && path === '/api/session') return login(request, context, space, 'family');
  if (method === 'POST' && path === '/api/logout') return logout(request, space, 'family');

  const family = await getSession(request, context, space, 'family');
  if (!family) throw unsigned();
  if (method === 'POST' && path === '/api/admin/session') return login(request, context, space, 'admin', family);
  if (method === 'POST' && path === '/api/admin/logout') return logout(request, space, 'admin');
  const admin = path.startsWith('/api/admin/');
  if (admin && !await getSession(request, context, space, 'admin', family)) throw new HttpError(403, 'Déverrouillez l’accès administrateur pour continuer.');
  if (method === 'GET' && path === (admin ? '/api/admin/bootstrap' : '/api/bootstrap')) {
    return json({ config: preferences(family.user), overview: await overview(space) });
  }
  if (method === 'POST' && path === '/api/receipts/analyze') return analyzeReceipt(request, family.user);
  return expenseRoute(request, url, space, family.user, admin);
}

export default async function handler(request, context) {
  try {
    return await handle(request, context);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error('Santé Famille: request failed', error?.name ?? 'Error');
    return json({ error: 'Le carnet est momentanément indisponible. Réessayez dans quelques instants.' }, 503);
  }
}

import { randomUUID } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { database } from '../../db/index.ts';
import { expenses } from '../../db/schema.ts';
import { headers, HttpError, json } from './http.mjs';
import { expenseForm, normalizeReceipt, receiptStore } from './receipts.mjs';

const DEFAULT_CATEGORIES = ['Consultation', 'Pharmacie', 'Dentaire', 'Optique', 'Analyses', 'Imagerie', 'Hospitalisation', 'Autre'];
const PAGE_SIZE = 12;

function configList(setting, fallback) {
  const options = (setting ?? '').split(',').map((value) => value.trim().normalize('NFC')).filter((value) => value && value.length <= 80);
  return options.length ? [...new Set(options)].slice(0, 50) : fallback;
}

export function preferences(user) {
  const display = [user?.user_metadata?.full_name, user?.user_metadata?.name, user?.email?.split('@')[0]]
    .find((value) => typeof value === 'string' && value.trim());
  const name = display?.trim().normalize('NFC').slice(0, 80) || 'Moi';
  return {
    name,
    people: configList(process.env.FAMILY_MEMBERS, [name]),
    categories: configList(process.env.EXPENSE_CATEGORIES, DEFAULT_CATEGORIES),
  };
}

function text(form, field, maximum, required = true) {
  const input = form.get(field);
  if (input === null && !required) return '';
  if (typeof input !== 'string') throw new HttpError(400, 'Vérifiez les champs du formulaire.');
  const value = input.trim().normalize('NFC');
  if ((required && !value) || value.length > maximum || value.includes('\0')) throw new HttpError(400, 'Vérifiez les champs du formulaire.');
  return value;
}

export function careDateOf(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2100-12-31') return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

async function create(request, space, user) {
  const form = await expenseForm(request);
  const config = preferences(user);
  const person = text(form, 'person', 80);
  const category = text(form, 'category', 80);
  const provider = text(form, 'provider', 140);
  const note = text(form, 'note', 1500, false);
  const careDate = careDateOf(text(form, 'careDate', 10));
  const amount = text(form, 'amount', 12).replace(',', '.');
  const price = amount.match(/^(\d{1,7})(?:\.(\d{1,2}))?$/);
  const cents = price && (Number(price[1]) * 100 + Number((price[2] ?? '').padEnd(2, '0')));
  if (!cents || !careDate || !config.people.includes(person) || !config.categories.includes(category)) {
    throw new HttpError(400, 'Vérifiez la personne, la catégorie, la date et le montant. Le montant doit être supérieur à zéro.');
  }
  if (form.getAll('receipt').length > 1) throw new HttpError(400, 'Un seul justificatif est autorisé par dépense.');
  const receipt = await normalizeReceipt(form.get('receipt'));
  const id = randomUUID();
  const key = `${space}/${id}`;
  const store = receipt && receiptStore();
  if (store) await store.set(key, receipt.data, { onlyIfNew: true });
  try {
    await database().insert(expenses).values({ id, space, ownerId: user.id, person, careDate, category, provider, cents, note, receipt: receipt?.name ?? null });
  } catch (error) {
    if (store) await store.delete(key).catch(() => {});
    throw error;
  }
  return json({ id }, 201);
}

function query(url, space) {
  const person = url.searchParams.get('person')?.trim().slice(0, 80);
  const needle = url.searchParams.get('q')?.trim().slice(0, 140).replace(/[\\%_]/g, '\\$&');
  const term = `%${needle}%`;
  return and(eq(expenses.space, space), person ? eq(expenses.person, person) : undefined,
    needle ? or(...[expenses.provider, expenses.category, expenses.person, expenses.note, expenses.receipt]
      .map((column) => ilike(column, term))) : undefined);
}

const fields = {
  id: expenses.id, person: expenses.person, careDate: expenses.careDate, category: expenses.category,
  provider: expenses.provider, cents: expenses.cents, note: expenses.note, receipt: expenses.receipt,
};

function monthBounds() {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year').value);
  const month = Number(parts.find((part) => part.type === 'month').value);
  return [new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10), new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)];
}

export async function overview(space) {
  const [from, to] = monthBounds();
  const [result] = await database().select({
    month: sql`coalesce(sum(${expenses.cents}) filter (where ${expenses.careDate} >= ${from}::date and ${expenses.careDate} < ${to}::date), 0)`.mapWith(Number),
    total: sql`coalesce(sum(${expenses.cents}), 0)`.mapWith(Number),
    count: count(),
  }).from(expenses).where(eq(expenses.space, space));
  const people = await database().selectDistinct({ name: expenses.person }).from(expenses).where(eq(expenses.space, space)).orderBy(expenses.person);
  return { ...result, people: people.map(({ name }) => name) };
}

async function history(url, space, user, admin) {
  const where = query(url, space);
  const input = Number(url.searchParams.get('page') ?? '1');
  const page = Number.isSafeInteger(input) && input > 0 && input <= 10_000 ? input : 1;
  const [rows, [totals]] = await Promise.all([
    database().select({ ...fields, ownerId: expenses.ownerId }).from(expenses).where(where)
      .orderBy(desc(expenses.careDate), desc(expenses.createdAt), desc(expenses.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    database().select({ count: count() }).from(expenses).where(where),
  ]);
  return json({ rows: rows.map(({ ownerId, ...row }) => ({ ...row, canDelete: !admin && ownerId === user.id })), page, count: totals.count, size: PAGE_SIZE });
}

async function receiptOrDelete(request, url, space, user, id, getReceipt, admin) {
  const where = and(eq(expenses.space, space), eq(expenses.id, id));
  const [row] = await database().select({ ownerId: expenses.ownerId, receipt: expenses.receipt }).from(expenses).where(where).limit(1);
  if (!row) throw new HttpError(404, 'Dépense introuvable.');
  const key = `${space}/${id}`;
  if (getReceipt && request.method === 'GET') {
    const photo = row.receipt && await receiptStore().get(key, { type: 'blob' });
    if (!photo) throw new HttpError(404, 'Justificatif introuvable.');
    const filename = `${row.receipt.replace(/\.[^.]+$/, '') || 'justificatif'}.webp`;
    const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16)}`);
    return new Response(photo, { headers: { ...headers, 'Content-Type': 'image/webp',
      'Content-Disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${encoded}` } });
  }
  if (!getReceipt && !admin && request.method === 'DELETE') {
    if (row.ownerId !== user.id) throw new HttpError(403, 'Seule la personne ayant saisi cette dépense peut la supprimer.');
    if (row.receipt) await receiptStore().delete(key);
    await database().delete(expenses).where(and(where, eq(expenses.ownerId, user.id)));
    return json({ deleted: true });
  }
  throw new HttpError(405, 'Action non autorisée.');
}

const exportColumns = ['Personne', 'Date des soins', 'Catégorie', 'Professionnel ou établissement', 'Montant (EUR)', 'Commentaire', 'Justificatif'];
const valuesOf = (row) => [row.person, row.careDate, row.category, row.provider, row.cents / 100, row.note, row.receipt ?? ''];
const quote = (text) => `"${String(text).replace(/^[\s\u200b-\u200f\ufeff]*[=+\-@]/, (match) => `'${match}`).replaceAll('"', '""')}"`;
const xml = (value) => String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function excel(rows) {
  const sheet = [exportColumns, ...rows.map(valuesOf)].map((row, index) => `<row r="${index + 1}">${row.map((value, column) => {
    const position = `${String.fromCharCode(65 + column)}${index + 1}`;
    return typeof value === 'number' ? `<c r="${position}"><v>${value}</v></c>` : `<c r="${position}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const parts = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dépenses" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="7" width="24" customWidth="1"/></cols><sheetData>${sheet}</sheetData></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(parts).map(([name, content]) => [name, strToU8(`<?xml version="1.0" encoding="UTF-8"?>${content}`)])));
}

async function download(url, space, format) {
  if (!['csv', 'xlsx', 'json'].includes(format)) throw new HttpError(404, 'Format d’export inconnu.');
  const rows = await database().select(fields).from(expenses).where(query(url, space))
    .orderBy(desc(expenses.careDate), desc(expenses.createdAt), desc(expenses.id)).limit(20_001);
  if (rows.length > 20_000) throw new HttpError(413, 'Trop de dépenses pour un seul export. Affinez la recherche ou filtrez par personne.');
  const contents = {
    csv: () => `\ufeff${[exportColumns.map(quote).join(';'), ...rows.map((row) => valuesOf(row).map((value) => typeof value === 'number' ? value.toFixed(2).replace('.', ',') : quote(value)).join(';'))].join('\r\n')}\r\n`,
    xlsx: () => excel(rows),
    json: () => JSON.stringify(rows.map(({ cents, ...row }) => ({ ...row, amount: cents / 100, currency: 'EUR' })), null, 2),
  };
  const mime = { csv: 'text/csv; charset=utf-8', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' };
  return new Response(contents[format](), { headers: { ...headers, 'Content-Type': mime[format], 'Content-Disposition': `attachment; filename="sante-famille.${format}"` } });
}

export async function expenseRoute(request, url, space, user, admin) {
  const path = url.pathname.replace(admin ? '/api/admin' : '/api', '');
  if (path === '/expenses' && request.method === 'GET') return history(url, space, user, admin);
  if (path === '/expenses' && request.method === 'POST' && !admin) return create(request, space, user);
  const item = path.match(/^\/expenses\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/receipt)?$/);
  if (item) return receiptOrDelete(request, url, space, user, item[1], Boolean(item[2]), admin);
  const exported = path.match(/^\/exports\/(csv|xlsx|json)$/);
  if (exported && request.method === 'GET') return download(url, space, exported[1]);
  throw new HttpError(404, 'Page introuvable.');
}

import { getStore } from '@netlify/blobs';
import { boundedBody, HttpError } from './http.mjs';

const FILE_LIMIT = 8 * 1024 * 1024;
const PIXEL_LIMIT = 26_000_000;
const FORMATS = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', heic: 'heif', heif: 'heif' };
let conversions = 0;

export function receiptStore() {
  return getStore({ name: 'sante-famille-receipts', consistency: 'strong' });
}

export async function expenseForm(request) {
  const contentType = request.headers.get('content-type');
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) throw new HttpError(415, 'Format de formulaire non pris en charge.');
  const body = await boundedBody(request, FILE_LIMIT + 24_576);
  try {
    return await new Response(body, { headers: { 'Content-Type': contentType } }).formData();
  } catch {
    throw new HttpError(400, 'Le formulaire ou le fichier ne peut pas être lu.');
  }
}

export async function normalizeReceipt(file, side = 2400) {
  if (!file || (file instanceof File && !file.name && !file.size)) return null;
  if (!(file instanceof File) || !file.size) throw new HttpError(400, 'Choisissez une photo non vide.');
  if (file.size > FILE_LIMIT) throw new HttpError(413, 'La photo doit peser moins de 8 Mo.');
  const name = file.name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim();
  const extension = name.split('.').pop().toLowerCase();
  const format = Object.hasOwn(FORMATS, extension) && FORMATS[extension];
  if (!format || name.length > 180) throw new HttpError(415, 'Choisissez une image JPG, PNG, WebP ou HEIC avec un nom de fichier valide.');
  if (conversions >= 2) throw new HttpError(503, 'Le traitement des photos est occupé. Réessayez dans un instant.');
  conversions += 1;
  try {
    const { default: sharp } = await import('sharp');
    const source = Buffer.from(await file.arrayBuffer());
    let image;
    if (format === 'heif') {
      if (source.toString('ascii', 4, 8) !== 'ftyp') throw new Error();
      const { default: decodeHeic } = await import('heic-decode');
      const images = await decodeHeic.all({ buffer: source });
      try {
        const primary = images[0];
        if (!primary?.width || !primary?.height || primary.width * primary.height > PIXEL_LIMIT) throw new Error();
        const { data, width, height } = await primary.decode();
        image = sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 }, limitInputPixels: PIXEL_LIMIT });
      } finally {
        images.dispose();
      }
    } else {
      image = sharp(source, { limitInputPixels: PIXEL_LIMIT, failOn: 'warning' });
      const metadata = await image.metadata();
      if (metadata.format !== format || !metadata.width || !metadata.height || metadata.width * metadata.height > PIXEL_LIMIT || (metadata.pages ?? 1) > 1) throw new Error();
      image.rotate();
    }
    const data = await image.resize(side, side, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    return { name, data: new Blob([data], { type: 'image/webp' }) };
  } catch (error) {
    if (['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(error.code) || error.message?.startsWith('Could not load the "sharp" module')) throw error;
    throw new HttpError(415, 'La photo est illisible, trop grande ou ne correspond pas à son extension. Essayez une autre image.');
  } finally {
    conversions -= 1;
  }
}

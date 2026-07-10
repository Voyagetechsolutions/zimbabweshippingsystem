import fs from 'fs';
import path from 'path';

// The AI answers product/catalogue questions from ONE of these sources, in order:
//   1. whatsapp-bot/data/catalogue.json  — [{ name, price, description, category }, ...]
//   2. whatsapp-bot/data/catalogue.md    — free-form text you maintain
//   3. CATALOGUE_URL env var             — a web page we fetch and strip to text
// Local files are preferred because WhatsApp catalogue pages are often JS-rendered
// and don't scrape well with a plain fetch.

let _cache = null;
let _cacheAt = 0;
const TTL_MS = 10 * 60 * 1000; // re-read every 10 minutes
const MAX_CHARS = 8000;        // keep token cost bounded

function formatItems(items) {
  if (!Array.isArray(items)) return '';
  return items
    .map((it) => {
      const parts = [`• ${it.name || 'Item'}`];
      if (it.price != null) parts.push(`— ${it.price}`);
      if (it.category) parts.push(`(${it.category})`);
      let line = parts.join(' ');
      if (it.description) line += `\n   ${it.description}`;
      return line;
    })
    .join('\n');
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getCatalogueText() {
  const now = Date.now();
  if (_cache !== null && now - _cacheAt < TTL_MS) return _cache;

  let text = '';
  const dataDir = path.resolve(process.cwd(), 'data');
  const jsonPath = path.join(dataDir, 'catalogue.json');
  const mdPath = path.join(dataDir, 'catalogue.md');

  try {
    if (fs.existsSync(jsonPath)) {
      text = formatItems(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
    } else if (fs.existsSync(mdPath)) {
      text = fs.readFileSync(mdPath, 'utf8');
    }
  } catch (err) {
    console.warn('Catalogue file read failed:', err?.message || err);
  }

  if (!text && process.env.CATALOGUE_URL) {
    try {
      const res = await fetch(process.env.CATALOGUE_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) text = htmlToText(await res.text());
      else console.warn('Catalogue URL returned', res.status);
    } catch (err) {
      console.warn('Catalogue URL fetch failed:', err?.message || err);
    }
  }

  _cache = (text || '').slice(0, MAX_CHARS);
  _cacheAt = now;
  return _cache;
}

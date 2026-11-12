#!/usr/bin/env node
/* ---------------------------------------------------------------------
   Atualiza data/youtube-latest.js com os vídeos mais recentes do canal.
   Usa o feed RSS público do YouTube (sem chave de API).

   Uso:   node scripts/update-youtube.mjs
   Env:   YT_CHANNEL_ID=UCxxxx  (opcional — se ausente, é descoberto a partir
          do @handle definido em config/videos.js)

   Em caso de falha de rede, o arquivo existente é mantido (exit 0), para que
   o site nunca fique sem vídeos.
   --------------------------------------------------------------------- */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'data/youtube-latest.js');
const KEEP = 6; // guarda alguns extras; o site exibe "limit" (config/videos.js)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; site-updater/1.0)',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Cookie': 'CONSENT=YES+1; SOCS=CAI'
};

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&amp;/g, '&').trim();

async function getHandle() {
  const cfg = await readFile(path.join(root, 'config/videos.js'), 'utf8');
  const m = cfg.match(/channelHandle\s*:\s*["']([^"']+)["']/);
  return m ? m[1] : '@bandauntold';
}

async function resolveChannelId(handle) {
  if (process.env.YT_CHANNEL_ID) return process.env.YT_CHANNEL_ID.trim();
  const res = await fetch(`https://www.youtube.com/${handle.startsWith('@') ? handle : '@' + handle}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Página do canal respondeu ${res.status}`);
  const html = await res.text();
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /"browseId":"(UC[\w-]{22})"/,
    /"channelId":"(UC[\w-]{22})"/
  ];
  for (const p of patterns) { const m = html.match(p); if (m) return m[1]; }
  throw new Error('Não foi possível descobrir o ID do canal');
}

async function fetchFeed(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Feed respondeu ${res.status}`);
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.map((e) => {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || null;
    const link = (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || '';
    return { id, title, published, short: link.includes('/shorts/') };
  }).filter((v) => v.id);
}

async function main() {
  try {
    const handle = await getHandle();
    const channelId = await resolveChannelId(handle);
    const videos = (await fetchFeed(channelId)).slice(0, KEEP);
    if (!videos.length) throw new Error('Feed sem vídeos');

    let previous = '';
    try { previous = await readFile(OUT, 'utf8'); } catch {}
    const prevList = (previous.match(/"videos":\s*(\[[\s\S]*?\])\s*\n\};/) || [])[1];
    if (prevList && JSON.stringify(JSON.parse(prevList)) === JSON.stringify(videos)) {
      console.log('Nenhum vídeo novo. Arquivo mantido.');
      return;
    }

    const body = JSON.stringify({ channelId, updated: new Date().toISOString(), videos }, null, 2);
    const file = `/* ARQUIVO GERADO AUTOMATICAMENTE por scripts/update-youtube.mjs
   (GitHub Actions: .github/workflows/youtube-latest.yml). Não edite à mão:
   para personalizar títulos/miniaturas use config/videos.js. */
window.UNTOLD_YT_LATEST = ${body};
`;
    await writeFile(OUT, file);
    console.log(`OK: ${videos.length} vídeos salvos (canal ${channelId}).`);
  } catch (err) {
    console.warn(`Aviso: não foi possível atualizar os vídeos (${err.message}). Arquivo existente mantido.`);
  }
}

main();

#!/usr/bin/env node
/* ============================================================
   Выгрузка изображений из Figma одним прогоном.

   Запуск:  node scripts/pull-figma-assets.mjs
   Токен:   FIGMA_TOKEN в .env рядом с этим репозиторием (в git не коммитить).

   Карта узлов лежит ниже единственным списком — правится только она.
   Ссылки, которые отдаёт Figma, живут около часа, поэтому качаем сразу.

   Дальше файлы нужно прогнать через два размера и WebP: сейчас это делается
   вручную (sips + Chrome), потому что cwebp и ImageMagick в окружении нет.
   ============================================================ */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_KEY = 't3K32ifBrrW1kD2BBbp1tA';

/* node-id → путь внутри assets/, без расширения */
const ASSETS = [
  ['469:240', 'b04b/scenario-2-main'],
  ['476:205', 'b04b/scenario-1-base'],
  ['476:277', 'b04b/scenario-3-extended'],
  ['469:237', 'b04b/thumb-2'],
  ['469:238', 'b04b/thumb-3'],
  ['469:239', 'b04b/thumb-4'],
  ['503:3',   'b06/case-2-after'],
  ['500:11',  'b06/case-thumb-2'],
  ['500:12',  'b06/case-thumb-3'],
  ['500:13',  'b06/case-thumb-4'],
];

async function token() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN;
  try {
    const env = await readFile(join(ROOT, '.env'), 'utf8');
    const hit = env.match(/^\s*FIGMA_TOKEN\s*=\s*(.+)$/m);
    if (hit) return hit[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* .env может не быть */ }
  throw new Error('Нет FIGMA_TOKEN: положи его в .env или передай переменной окружения');
}

async function main() {
  const pat = await token();
  const ids = ASSETS.map(([id]) => id).join(',');

  const api = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=jpg&scale=2`;
  const res = await fetch(api, { headers: { 'X-Figma-Token': pat } });
  if (!res.ok) throw new Error(`Figma ответила ${res.status}: ${await res.text()}`);

  const { images, err } = await res.json();
  if (err) throw new Error(`Figma вернула ошибку: ${err}`);

  let ok = 0;
  for (const [id, path] of ASSETS) {
    const url = images[id];
    if (!url) { console.warn(`  пропуск ${id} (${path}): ссылки нет`); continue; }

    const file = await fetch(url);
    if (!file.ok) { console.warn(`  пропуск ${id}: ${file.status}`); continue; }

    const out = join(ROOT, 'assets', `${path}@2x.jpg`);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await file.arrayBuffer()));
    console.log(`  ${path}@2x.jpg`);
    ok++;
  }

  console.log(`\nСкачано ${ok} из ${ASSETS.length}. Дальше — размеры и WebP.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });

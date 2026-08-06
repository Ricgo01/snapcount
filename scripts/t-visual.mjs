import { chromium } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const BASE = process.env.SHOTS_BASE_URL ?? 'https://snapcount-ten.vercel.app';
const OUT = path.join(os.tmpdir(), 'snapcount-shots');
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage();
await p.setViewportSize({ width: 1440, height: 1000 });

async function shot(url, file, fullPage = false) {
  await p.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(OUT, `${file}.png`), fullPage });
  console.log(`${file} ok`);
}

await shot('/', 'v_home');
await shot('/teams', 'v_teams');
await shot('/season', 'v_season_w1');
await shot('/season?week=playoffs&season=2026-27', 'v_po_2026');
await shot('/season?week=playoffs&season=2025-26', 'v_po_2025');

// Team page actual: tabs games + depth
await p.goto(`${BASE}/team/KC`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await p.screenshot({ path: path.join(OUT, 'v_team_kc_2026.png') });
console.log('v_team_kc_2026 ok');
await p.getByText('Depth chart', { exact: true }).first().click();
await p.waitForTimeout(800);
await p.screenshot({ path: path.join(OUT, 'v_team_kc_depth.png') });
console.log('v_team_kc_depth ok');

// Team histórico
await shot('/team/NE?season=2007-08', 'v_team_ne_2007');

// Game histórico con stats
await shot('/game/401671788', 'v_game_2024');

await b.close();
console.log(`Screenshots saved to ${OUT}`);

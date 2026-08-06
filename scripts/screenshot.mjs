import { chromium } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(os.tmpdir(), 'snapcount-shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

const shots = [
  { url: 'http://localhost:3000/', file: 'shot_home.png' },
  { url: 'http://localhost:3000/season?week=14', file: 'shot_season.png' },
  { url: 'http://localhost:3000/teams', file: 'shot_teams.png' },
  { url: 'http://localhost:3000/season?week=playoffs', file: 'shot_playoffs.png' },
];

for (const { url, file } of shots) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, file) });
  console.log('Done:', file);
}

await browser.close();
console.log(`Screenshots saved to ${OUT}`);

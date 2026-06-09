import { chromium } from 'playwright';

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
  await page.screenshot({ path: `C:/Users/richi/AppData/Local/Temp/${file}` });
  console.log('Done:', file);
}

await browser.close();

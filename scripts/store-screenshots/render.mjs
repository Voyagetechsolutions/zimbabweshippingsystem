#!/usr/bin/env node
/**
 * Render App Store screenshots at exactly 1320x2868 (iPhone 6.9", the only
 * size class Apple still requires).
 *
 *   node scripts/store-screenshots/render.mjs                 # every app
 *   node scripts/store-screenshots/render.mjs customer-app    # just one
 *
 * Copy and source screens live in slides.json; the visual frame is
 * template.html. Output lands in store-assets/ios/<app>/.
 *
 * Uses puppeteer-core against a Chrome already on this machine — no browser
 * download. Override with PUPPETEER_EXECUTABLE_PATH if it can't find one.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const WIDTH = 1320;
const HEIGHT = 2868;
const SCALE = 2; // template.html is authored at 660x1434 CSS px

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  const home = os.homedir();
  const roots = [
    path.join(home, '.cache/puppeteer/chrome'),
    path.join(home, 'AppData/Local/ms-playwright'),
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-linux64/chrome', 'chrome-mac-x64/Chromium.app/Contents/MacOS/Chromium']) {
        const exe = path.join(root, entry, rel);
        if (fs.existsSync(exe)) return exe;
      }
    }
  }

  for (const exe of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]) {
    if (fs.existsSync(exe)) return exe;
  }

  throw new Error('No Chrome found. Set PUPPETEER_EXECUTABLE_PATH to a Chrome binary.');
}

function toDataUri(relPath) {
  if (!relPath) return null;
  const abs = path.resolve(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const ext = path.extname(abs).toLowerCase() === '.jpg' ? 'jpeg' : 'png';
  return `data:image/${ext};base64,${fs.readFileSync(abs).toString('base64')}`;
}

const config = JSON.parse(fs.readFileSync(path.join(HERE, 'slides.json'), 'utf8'));
const only = process.argv[2];
const apps = Object.entries(config.apps).filter(([name]) => !only || name === only);

if (!apps.length) {
  console.error(`Unknown app "${only}". Known: ${Object.keys(config.apps).join(', ')}`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars'],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH / SCALE, height: HEIGHT / SCALE, deviceScaleFactor: SCALE });
await page.goto(pathToFileURL(path.join(HERE, 'template.html')).href, { waitUntil: 'networkidle0' });

// The headline font comes from Google Fonts. Browsers only fetch a webfont once
// something actually uses it, so ask for it explicitly before checking.
const fontOk = await page.evaluate(async () => {
  try {
    await document.fonts.load('800 78px "Plus Jakarta Sans"');
  } catch {
    return false;
  }
  return document.fonts.check('800 78px "Plus Jakarta Sans"');
});
if (!fontOk) console.warn('! Plus Jakarta Sans did not load — falling back to Segoe UI. Check network.');

let missing = 0;

for (const [app, slides] of apps) {
  const outDir = path.join(ROOT, config.output, app);
  fs.mkdirSync(outDir, { recursive: true });

  for (const slide of slides) {
    const screenDataUri = toDataUri(slide.screen);
    if (slide.screen && !screenDataUri) {
      console.warn(`! missing source screen: ${slide.screen}`);
      missing++;
    }

    // capture.mjs leaves a sidecar recording the app's header colour, so the
    // overlaid status bar picks its own contrast.
    let topColour = null;
    if (slide.screen) {
      const sidecar = path.resolve(ROOT, slide.screen).replace(/\.png$/i, '.json');
      if (fs.existsSync(sidecar)) {
        topColour = JSON.parse(fs.readFileSync(sidecar, 'utf8')).topColour ?? null;
      }
    }

    await page.evaluate((s) => window.renderSlide(s), { ...slide, screenDataUri, topColour });

    const out = path.join(outDir, `${slide.slug}.png`);
    await page.screenshot({ path: out, type: 'png' });
    console.log(`${path.relative(ROOT, out)}  ${WIDTH}x${HEIGHT}${screenDataUri ? '' : '  (placeholder)'}`);
  }
}

await browser.close();

if (missing) {
  console.log(`\n${missing} slide(s) rendered with a placeholder.`);
  console.log('Drop real captures at the paths above, then re-run. See scripts/store-screenshots/README.md.');
}

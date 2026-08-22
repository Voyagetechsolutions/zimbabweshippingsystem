#!/usr/bin/env node
/**
 * Capture raw app screens from the Expo *web* build at iPhone 6.9" resolution,
 * ready to be framed by render.mjs.
 *
 * Start the dev server first (they are already in .claude/launch.json):
 *   customer-app  ->  npm --prefix customer-app run web -- --port 8084
 *   staff-app     ->  npm --prefix staff-app    run web -- --port 8082
 *
 * Then:
 *   node scripts/store-screenshots/capture.mjs customer-app
 *   node scripts/store-screenshots/capture.mjs customer-app --theme dark
 *
 * SIGNED-IN SCREENS: as a guest, Shipments/Billing are empty "sign in" states,
 * which make poor store art. Log in once, by hand, in a visible browser:
 *
 *   node scripts/store-screenshots/capture.mjs customer-app --login
 *
 * That opens Chrome with a persistent profile under .cache/ — sign in, then
 * close the window. Every later run reuses that session and captures real data.
 * Nobody's password goes near this script or the repo.
 *
 * Output: scripts/store-screenshots/screens/<app>/<name>.png at 1206x2622,
 * which is the 1320:2868 aspect the store frame expects.
 *
 * Web rendering is close to native but not identical. These are good enough for
 * store art; if a screen looks wrong, capture that one on a real device instead
 * and drop it in the same folder under the same name.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// 402x874 @3x is the iPhone 16 Pro logical viewport -> 1206x2622 (0.460 ratio).
const VIEWPORT = { width: 402, height: 874, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

// A browser reports no safe-area insets, so content runs edge to edge: the tab
// bar hugs the bottom and its labels clip, and the header slides under where the
// Dynamic Island will be. Reserve both strips the way iOS actually does.
const SAFE_BOTTOM = 34;
const SAFE_TOP = 54; // render.mjs draws the status bar over this band

/**
 * `taps` are visible labels tapped in order before the screenshot. Whitespace
 * is normalised, so a two-line button reads as "Book Shipment". Each screen
 * continues from wherever the previous one left off.
 */
const TARGETS = {
  'customer-app': {
    url: 'http://localhost:8084',
    screens: [
      { name: 'home', taps: ['SKIP'] },            // skip the onboarding carousel
      { name: 'shipments', taps: ['Shipments'] },
      { name: 'schedule', taps: ['Schedule'] },
      { name: 'book', taps: ['Home', 'Book Shipment'] },
    ],
  },
  'staff-app': {
    url: 'http://localhost:8082/?reviewPreview=1',
    screens: [
      { name: 'dashboard', taps: ['Admin'] },
      { name: 'shipments', taps: ['Driver'] },
      { name: 'schedule', taps: ['Finance'] },
    ],
  },
};

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const home = os.homedir();
  for (const root of [path.join(home, '.cache/puppeteer/chrome'), path.join(home, 'AppData/Local/ms-playwright')]) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-linux64/chrome']) {
        const exe = path.join(root, entry, rel);
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  throw new Error('No Chrome found. Set PUPPETEER_EXECUTABLE_PATH.');
}

const app = process.argv[2];
const loginMode = process.argv.includes('--login');
const themeArg = process.argv.indexOf('--theme');
const theme = themeArg > -1 ? process.argv[themeArg + 1] : 'light';
const target = TARGETS[app];

if (!target) {
  console.error(`usage: node capture.mjs <${Object.keys(TARGETS).join('|')}> [--login] [--theme light|dark]`);
  process.exit(1);
}

// Persisted browser profile, so a hand-typed sign-in survives between runs.
// Gitignored — it holds a live session token.
const profileDir = path.join(HERE, '.cache', app);
fs.mkdirSync(profileDir, { recursive: true });

const outDir = path.join(HERE, 'screens', app);
fs.mkdirSync(outDir, { recursive: true });

console.log('starting capture browser …');
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: loginMode ? false : 'new',
  timeout: 180000,
  protocolTimeout: 180000,
  userDataDir: profileDir,
  defaultViewport: VIEWPORT,
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'],
});

console.log('capture browser ready');
const page = await browser.newPage();
console.log('capture page ready');
await page.setViewport(VIEWPORT);

// The apps follow the system theme (`userInterfaceStyle: "automatic"`).
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

console.log(`loading ${target.url} … (theme: ${theme})`);
await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 180000 });

// Metro serves a shell immediately and hydrates after; wait for real content.
await page
  .waitForFunction(() => document.body && document.body.innerText.trim().length > 20, { timeout: 180000 })
  .catch(() => console.warn('! app did not render text within timeout — capturing anyway'));
await new Promise((r) => setTimeout(r, 2500));

/**
 * Reserve the status-bar and home-indicator strips, painting each in whatever
 * colour the app itself puts there, so the result matches a real device capture.
 * Returns the sampled top colour — render.mjs uses it to decide whether the
 * status bar it overlays should be black-on-light or white-on-dark.
 */
async function applySafeAreas() {
  return page.evaluate(
    ({ safeTop, safeBottom }) => {
      const root = document.getElementById('root') || document.body.firstElementChild;
      if (!root) return null;

      // Sample the app's own colour just below where the status bar will sit,
      // before any padding shifts things around.
      const probe = document.elementFromPoint(window.innerWidth / 2, 4);
      let topColor = null;
      for (let el = probe; el && el !== document.documentElement; el = el.parentElement) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && !bg.startsWith('rgba(0, 0, 0, 0)')) {
          topColor = bg;
          break;
        }
      }

      const inner = root.firstElementChild || root;
      const bottomColor = getComputedStyle(inner).backgroundColor;
      if (bottomColor && bottomColor !== 'rgba(0, 0, 0, 0)') document.body.style.background = bottomColor;

      const style = document.createElement('style');
      style.textContent = `
        #root {
          position: absolute !important;
          top: ${safeTop}px !important;
          left: 0 !important;
          right: 0 !important;
          height: calc(100vh - ${safeTop + safeBottom}px) !important;
          overflow: hidden !important;
        }
        /* The strip above the app gets the app's own header colour, exactly as
           iOS renders it behind the status bar. */
        body::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: ${safeTop}px;
          background: ${topColor || '#ffffff'};
          z-index: 2147483647;
        }
      `;
      document.head.appendChild(style);
      return topColor;
    },
    { safeTop: SAFE_TOP, safeBottom: SAFE_BOTTOM },
  );
}

await applySafeAreas();
await new Promise((r) => setTimeout(r, 1200));

/**
 * Each screen has its own header colour, so re-sample just below the reserved
 * strip and repaint it. Returns the colour for render.mjs's status-bar contrast.
 */
async function syncTopStrip() {
  return page.evaluate((safeTop) => {
    const probe = document.elementFromPoint(window.innerWidth / 2, safeTop + 4);
    let colour = null;
    for (let el = probe; el && el !== document.documentElement; el = el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') {
        colour = bg;
        break;
      }
    }
    if (!colour) return null;

    let style = document.getElementById('__top_strip');
    if (!style) {
      style = document.createElement('style');
      style.id = '__top_strip';
      document.head.appendChild(style);
    }
    style.textContent = `body::before { background: ${colour} !important; }`;
    return colour;
  }, SAFE_TOP);
}

/**
 * react-navigation sizes the tab bar as 49pt + safe-area inset. The browser
 * reports a zero inset, so the bar comes out too short and clips its own
 * labels. Find it by geometry and let it size to its content.
 */
async function unclipTabBar() {
  await page.evaluate(() => {
    // Measure against the app root, not the window — the root has been shortened
    // to leave the home-indicator strip, so the bar no longer ends at innerHeight.
    const root = document.getElementById('root') || document.body.firstElementChild;
    const bottom = root ? root.getBoundingClientRect().bottom : window.innerHeight;

    const bar = [...document.querySelectorAll('div')].find((el) => {
      const r = el.getBoundingClientRect();
      if (r.height > 110 || r.height < 30) return false;
      if (Math.abs(r.bottom - bottom) > 6) return false;
      if (r.width < window.innerWidth * 0.9) return false;
      const leaves = [...el.querySelectorAll('div,span')].filter(
        (c) => c.children.length === 0 && c.textContent.trim(),
      );
      return leaves.length >= 3;
    });
    if (!bar) return;
    bar.style.height = 'auto';
    bar.style.minHeight = '62px';
    bar.style.paddingBottom = '6px';
    bar.style.overflow = 'visible';
  });
  await new Promise((r) => setTimeout(r, 400));
}

await unclipTabBar();

/**
 * Tap an element by its visible label. Uses a real mouse click at the element's
 * centre — react-native-web's Pressables listen for pointer events and ignore a
 * synthetic MouseEvent dispatched straight at the node.
 */
async function tap(label) {
  const box = await page.evaluate((text) => {
    const hits = [...document.querySelectorAll('div,span,a,button')].filter((el) => {
      const r = el.getBoundingClientRect();
      return el.textContent.trim().replace(/\s+/g, ' ') === text && r.width > 0 && r.height > 0;
    });
    if (!hits.length) return null;
    // Innermost match is the text node itself, which is what receives the tap.
    const r = hits[hits.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);

  if (!box) {
    console.warn(`! nothing labelled "${label}" on screen — continuing`);
    return false;
  }

  await page.mouse.click(box.x, box.y);
  await new Promise((r) => setTimeout(r, 2000));
  return true;
}

if (loginMode) {
  console.log('\nSign in in the browser window, then close it. Nothing is captured in this mode.');
  console.log(`Session will persist in ${path.relative(process.cwd(), profileDir)}`);
  await new Promise((resolve) => browser.on('disconnected', resolve));
  console.log('Saved. Re-run without --login to capture.');
  process.exit(0);
}

const signedOut = await page.evaluate(() =>
  /sign in to see|browsing as a guest|staff access only/i.test(document.body.innerText),
);
if (signedOut) {
  console.warn('\n! capturing while SIGNED OUT — screens will show empty states or the login form.');
  console.warn('! run once with --login to record a session first.\n');
}

for (const screen of target.screens) {
  for (const label of screen.taps) await tap(label);
  await unclipTabBar(); // navigation can remount the bar
  const topColour = await syncTopStrip();

  const out = path.join(outDir, `${screen.name}.png`);
  await page.screenshot({ path: out, type: 'png' });

  // Sidecar so render.mjs can pick a readable status-bar colour without anyone
  // hand-maintaining a light/dark list.
  fs.writeFileSync(
    path.join(outDir, `${screen.name}.json`),
    JSON.stringify({ topColour, theme, capturedAt: new Date().toISOString() }, null, 2),
  );

  console.log(
    `${path.relative(process.cwd(), out)}  ${VIEWPORT.width * VIEWPORT.deviceScaleFactor}x${VIEWPORT.height * VIEWPORT.deviceScaleFactor}  top:${topColour || '?'}`,
  );
}

await browser.close();

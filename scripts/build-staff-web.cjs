#!/usr/bin/env node
/**
 * Build the staff app as an installable web app (PWA).
 *
 * This exists because iOS has no sideloading story: an .ipa cannot be built
 * without a paid Apple Developer Program membership, and cannot be installed by
 * emailing it to someone even then. A PWA gets the staff app onto an iPhone home
 * screen today — the staff member opens the URL in Safari and taps Share → "Add
 * to Home Screen", and it launches fullscreen with its own icon, no Safari
 * chrome. It is the stopgap until the Apple enrolment clears; see
 * docs/IOS_APP_STORE_SUBMISSION.md for the real distribution route.
 *
 *   node scripts/build-staff-web.cjs
 *
 * Output: staff-app/dist/ — a static folder to drop on any host.
 *
 * `expo export` writes a bare index.html with no PWA metadata and no way to
 * customise the template (that needs Expo Router's +html.tsx, and this app uses
 * React Navigation). So the head is patched afterwards, which is why this
 * wrapper exists rather than a plain npm script.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { build: buildIcon } = require('./make-ios-icon.cjs');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'staff-app');
const DIST = path.join(APP, 'dist');

const APP_NAME = 'Zimbabwe Shipping Staff';
const SHORT_NAME = 'ZS Staff';   // iOS truncates home-screen labels around 12 chars
const THEME = '#03162f';         // new staff-app icon/splash background
const BACKGROUND = '#03162f';

// iOS uses apple-touch-icon at 180; the manifest sizes are for Android/desktop.
const ICONS = [180, 192, 512];

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd: APP, stdio: 'inherit' });
}

function patchIndexHtml() {
  const file = path.join(DIST, 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  // viewport-fit=cover lets the app paint under the notch and home indicator,
  // which is what makes a standalone PWA stop looking like a web page.
  html = html.replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
  );

  const head = [
    '<link rel="manifest" href="manifest.webmanifest" />',
    `<meta name="theme-color" content="${THEME}" />`,
    // The Apple-prefixed tags are the ones iOS Safari actually honours for
    // Add to Home Screen; the manifest alone does nothing there.
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    `<meta name="apple-mobile-web-app-title" content="${SHORT_NAME}" />`,
    '<link rel="apple-touch-icon" href="icon-180.png" />',
    // Staff tooling: keep it out of search results.
    '<meta name="robots" content="noindex, nofollow" />',
  ].join('\n    ');

  html = html.replace('</head>', `  ${head}\n  </head>`);
  fs.writeFileSync(file, html);
  console.log(`patched ${path.relative(ROOT, file)}`);
}

function writeManifest() {
  const manifest = {
    name: APP_NAME,
    short_name: SHORT_NAME,
    description: 'Collections, driver runs and finance for Zimbabwe Shipping staff.',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: THEME,
    background_color: BACKGROUND,
    icons: ICONS.map((size) => ({
      src: `icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    })),
  };

  const file = path.join(DIST, 'manifest.webmanifest');
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

// Emitted into dist/ so the folder is deployable on its own:
//   cd staff-app/dist && npx vercel deploy
function writeHostConfig() {
  const config = {
    // React Navigation drives the URL on web, so deep links must fall back to
    // the shell. Static files still win — this only catches unmatched paths.
    rewrites: [{ source: '/(.*)', destination: '/' }],
    headers: [
      {
        source: '/(.*)',
        headers: [
          // Internal staff tooling on a guessable URL: keep it out of indexes.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ],
  };

  const file = path.join(DIST, 'vercel.json');
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

function writeIcons() {
  const source = path.join(APP, 'assets', 'staff-icon-v2.png');
  for (const size of ICONS) {
    buildIcon(source, path.join(DIST, `icon-${size}.png`), size);
  }
}

// `expo export` refuses to overwrite a populated output directory.
fs.rmSync(DIST, { recursive: true, force: true });

run('npx expo export --platform web --output-dir dist');
writeIcons();
writeManifest();
writeHostConfig();
patchIndexHtml();

console.log(`\nDone. Serve or upload ${path.relative(ROOT, DIST)}/`);
console.log('It must be served over HTTPS — iOS will not install a PWA, or grant');
console.log('camera access, from a plain http:// origin.');

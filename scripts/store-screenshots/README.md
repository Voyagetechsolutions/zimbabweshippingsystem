# App Store screenshot generator

Produces the **1320 × 2868** (iPhone 6.9") PNGs App Store Connect requires, for
both `customer-app` and `staff-app`. Two stages:

| Stage | Script | What it does |
|---|---|---|
| 1. Capture | `capture.mjs` | Drives the Expo **web** build in headless Chrome and screenshots real app screens at 1206 × 2622 |
| 2. Frame | `render.mjs` | Composites each capture into the branded marketing frame — headline, flag rule, iPhone body, iOS status bar |

Captures land in `screens/<app>/`, finished art in `store-assets/ios/<app>/`.

Chrome comes from whatever's already on the machine (puppeteer or playwright
cache, or an installed Chrome). Override with `PUPPETEER_EXECUTABLE_PATH`.

---

## Run it

Start the dev server first — both are in `.claude/launch.json`:

```bash
npm --prefix customer-app run web -- --port 8084
```

```bash
npm --prefix staff-app run web -- --port 8082
```

Then capture and frame:

```bash
node scripts/store-screenshots/capture.mjs customer-app
```

```bash
node scripts/store-screenshots/render.mjs customer-app
```

Omit the app name on `render.mjs` to rebuild everything. `capture.mjs` takes
`--theme dark` if you want the dark palette.

## Signed-in screens

**This matters more than anything else here.** As a guest, Shipments and Billing
render empty "Sign in to see your shipments" states, and the staff app never
gets past its login screen. Those make terrible store art.

Log in once, by hand:

```bash
node scripts/store-screenshots/capture.mjs staff-app --login
```

A real Chrome window opens. Sign in, then close it. The session persists in
`.cache/<app>/` (gitignored) and every later headless run captures real data.
No password is typed by, stored in, or visible to these scripts.

`capture.mjs` warns loudly if it detects it is running as a guest.

## Editing the output

**Copy and screen choice** — `slides.json`. Each slide has a `slug` (the output
filename), a `headline` (`\n` forces a line break) and a `screen` path. Add or
remove slides freely; the App Store accepts 1–10 per app.

**Which app screens get captured** — the `TARGETS` table at the top of
`capture.mjs`. `taps` is a list of visible button labels tapped in order before
the screenshot; whitespace is normalised, so a two-line button is `"Book
Shipment"`. Screens run in sequence, each continuing from the last.

**Visual design** — `template.html`. It is authored at 660 × 1434 CSS px and
rendered at `deviceScaleFactor: 2`, so every length in there is half the final
pixel value. The knobs are the CSS variables at the top: `--phone-w`,
`--phone-top`, `--bezel`, `--screen-radius`.

## Things worth knowing

- **Safe areas are faked.** A browser reports zero safe-area insets, so the app
  header slides under the Dynamic Island and the tab bar clips its own labels.
  `capture.mjs` reserves a 54px top and 34px bottom strip and paints them in the
  app's own colours, which is what iOS actually does.
- **Status bar contrast is automatic.** `capture.mjs` samples the app's header
  colour per screen and writes it to `screens/<app>/<name>.json`; `render.mjs`
  reads that and picks white or black glyphs by luminance. Nothing to maintain
  by hand.
- **The device frame is deliberately iPhone-shaped.** The existing Play Store
  art in `store-assets/customer-app/` shows a punch-hole *Android* phone, which
  is a bad look in an iOS listing.
- **Web is not native.** Rendering is close but not identical — `react-native-maps`
  in particular does not render on web. If a screen looks wrong, capture that one
  on a real device and drop the PNG into `screens/<app>/` under the same name;
  `render.mjs` does not care where the image came from, only that it is roughly
  1320:2868.
- Google Fonts supplies the headline face (Plus Jakarta Sans, matching the
  website). Offline, it falls back to Segoe UI and `render.mjs` warns.

# Staff app on iPhone — web stopgap

Getting the staff app onto iPhones **today**, while the Apple Developer Program
enrolment is still pending. This is a stopgap, not the destination — the real
route is the Apple Business Manager Custom App in
[IOS_APP_STORE_SUBMISSION.md](./IOS_APP_STORE_SUBMISSION.md).

## Why not just build an .ipa

You can't, and neither can anyone else on this account yet:

```
$ npx eas-cli device:list
No Apple teams found for account vtsapps2026.
```

Unlike Android, iOS has no sideloading story. Every `.ipa` must be code-signed
with a provisioning profile that names in advance how it will be installed, and
often which exact devices. Getting a signing certificate at all requires the
paid membership. Even once you have one, you cannot simply email an `.ipa` to a
staff member — it has to go through TestFlight, Ad Hoc with pre-registered
device UDIDs, or ABM.

A PWA sidesteps Apple entirely. The staff member opens a URL in Safari, taps
Share → **Add to Home Screen**, and gets an icon that launches fullscreen with
no browser chrome. It is not an App Store app, but for internal staff tooling
the difference is mostly cosmetic.

## Build it

```bash
cd staff-app && npm run build:web
```

That runs [scripts/build-staff-web.cjs](../scripts/build-staff-web.cjs), which
exports the app and then patches in the PWA metadata `expo export` doesn't
write (`apple-mobile-web-app-capable`, `apple-touch-icon`, the manifest,
`viewport-fit=cover` for the notch). Output is `staff-app/dist/` — a static
folder, about 2.4 MB.

Supabase credentials are read from `staff-app/.env` and baked into the bundle at
build time, same as any `EXPO_PUBLIC_` var. Rebuild after changing them.

## Host it

**It must be HTTPS.** iOS will not install a PWA, and will not grant camera
access, from a plain `http://` origin. `localhost` is exempt for testing only.

The build writes its own `dist/vercel.json` (SPA rewrites plus `X-Robots-Tag:
noindex`), so the folder deploys as a standalone project — separate from the
main site, nothing pointed at `zimbabweshipping.com`:

```bash
cd staff-app/dist && npx vercel deploy --yes
```

That prints a preview URL to open on the iPhone. When you're happy with it,
`npx vercel deploy --prod --yes` from the same folder gives a stable URL that
doesn't change on each deploy — worth doing before staff add it to their home
screens, since a preview URL is per-deployment.

Any other static host works too; there is no server-side component.

## What to send the staff member

> 1. Open **Safari** (it must be Safari — Chrome on iOS can't add to home screen)
> 2. Go to `https://<your-url>`
> 3. Tap the **Share** button, then **Add to Home Screen**
> 4. Open it from the new icon, then sign in with your staff account

## What works, and what doesn't

Verified in the built export at an iPhone viewport: the app loads, renders, and
persists sessions with no console errors.

| | |
|---|---|
| Login + session persistence | Works. `AsyncStorage` maps to `localStorage`, so they stay signed in between launches |
| **QR scanning** | **Works** — `expo-camera` decodes on web with `jsQR`, not the `BarcodeDetector` API that Safari lacks. But see the CDN caveat below |
| Photo capture (proofs) | Works. `expo-image-picker` becomes a file input, which opens the iOS camera |
| Printing / sharing | Works via `window.print()` and the Web Share API |
| Maps on driver runs | Falls back to [RunMap.tsx](../staff-app/src/components/RunMap.tsx), the non-native placeholder that already existed |
| **Offline use** | **Does not work.** No service worker, so a driver with no signal gets nothing. This is the biggest gap versus a native build |
| Push notifications | Not used by this app, so nothing lost |

### The QR CDN caveat

`expo-camera`'s web scanner pulls `jsQR` from
`https://cdn.jsdelivr.net/npm/jsqr@1.2.0/dist/jsQR.min.js` into a Web Worker at
scan time. So scanning needs live internet, not just a loaded page — and it will
fail silently on a bad connection.

The fallback is already built in:
[CollectionScannerScreen.tsx:216](../staff-app/src/screens/CollectionScannerScreen.tsx:216)
has an **"Or enter QR token"** field beside the camera. Tell drivers about it.

If scanning proves flaky in the field, vendoring `jsQR` locally instead of
pulling it from the CDN would fix it, and is a small change.

## Security

The build is a public URL containing the Supabase **anon** key — the same key
already shipped in the website bundle and both mobile apps. It is not a secret;
RLS is what protects the data, and every screen is behind the staff login.

Still, since this is internal tooling on a guessable URL:

- The export sets `robots: noindex, nofollow` so it stays out of search results
- Use a non-obvious subdomain, and insist on strong staff passwords
- Retire the URL once the ABM Custom App is live

## Retiring this

Once the Developer Program membership clears, the native route resumes exactly
where it left off — `staff-app/eas.json` is already configured for it. Take the
PWA down then, so there's only one copy of the staff app in circulation.

**On the enrolment delay:** four days of silence is normal for an *Organization*
enrolment, which needs D-U-N-S verification and can take two weeks or more.
Individual enrolment usually clears in about 48 hours. If the wait is blocking
operations, switching to individual is much faster — the trade-off is that your
personal legal name shows as the seller instead of "Zimbabwe Shipping Services".
For a Custom App distributed privately through ABM, almost nobody ever sees that
seller name.

# iOS App Store submission — customer-app & staff-app

Both apps build on EAS Build's cloud macOS workers, so **everything here runs
from Windows**. The staff app was upgraded to **Expo SDK 57 / React Native
0.86** on 2026-08-11 so production builds use Xcode 26 and the iOS 26 SDK,
which Apple has required for uploads since 2026-04-28.

| | customer-app | staff-app |
|---|---|---|
| Bundle ID | `com.voyagetech.zimbabweshipphing` | `com.zimbabweshipping.staff` |
| EAS project | `6929c815-70fa-4c08-982a-267d84b0bcc9` | `2b720f8b-c079-497c-bcbe-003de4e27e89` |
| EAS account | `vtsapps2026` | `vtsapps2026` |
| iPad support | no | no |
| Distribution | public App Store | **TestFlight external** now, ABM Custom App later |

---

## Step 0a — Current route: guest on someone else's team (2026-08-05)

Rather than wait out our own enrolment, we were added to a **third party's**
Apple Developer team with the **App Manager** role. That unblocks the staff app
entirely and the customer app almost entirely. What the role can and cannot do:

| | App Manager |
|---|---|
| Register bundle IDs, certificates, provisioning profiles | ✅ |
| Create the App Store Connect app record | ✅ |
| Upload builds, run TestFlight, submit for review | ✅ |
| **Keys section — the Sign in with Apple `.p8`** | ❌ **Admin/Account Holder only** |

**The `.p8` gap only affects the customer app.** The staff app signs in with
email and password, so nothing there is blocked. When the customer app ships,
the account owner has to create that key and send it over — see Step 4b.

### Two things to be clear-eyed about

- **The app lives in their account.** It lists under their organization name,
  they control the listing, and if the relationship ends the app goes with them.
  Fine as a way to move now; not where this should stay.
- **TestFlight builds expire after 90 days.** A new build has to be uploaded
  each quarter to keep staff working. That makes TestFlight a good bridge, not a
  permanent answer — the ABM Custom App route is still the destination, and it
  needs *that organization* enrolled in Apple Business Manager.

### Getting the staff app onto staff iPhones

Staff are not users on that Apple team, and adding them would need Admin — which
we don't have. So use **external** TestFlight, not internal:

1. App Store Connect → **+ App** → bundle ID `com.zimbabweshipping.staff`
2. `cd staff-app && npx eas-cli build --platform ios --profile production`
   (prompts for the Apple login, then creates the certificate and profile for you)
3. `npx eas-cli submit --platform ios --latest`
4. TestFlight → **External testing** group → submit for **Beta App Review**
   (one-off, usually ~24h) → then invite staff by email or public link

Beta App Review still needs **working demo credentials** — the app is login-
gated and will otherwise be rejected on sight.

Until that lands, the PWA in [STAFF_APP_WEB_STOPGAP.md](./STAFF_APP_WEB_STOPGAP.md)
covers the gap. Retire it once TestFlight is live so there's only one staff app
in circulation.

### iOS readiness audit — staff-app, 2026-08-11

Run before submitting. `npx expo-doctor` now passes **20/20**; `npx tsc --noEmit`
and `npm run build:web` are clean.

Fixed in this pass:

| Finding | Why it mattered |
|---|---|
| Staff app was on Expo SDK 54 / Xcode 16.1 | Apple now requires Xcode 26 and the iOS 26 SDK for uploads. The staff app now uses Expo SDK 57 / React Native 0.86 and its dependencies match Expo Doctor. |
| Static `app.json` plus dynamic `app.config.js` produced competing release metadata | The staff app now has one `app.config.js`, including the SDK-required font, sharing and status-bar plugins. |
| New branded icon source was 1254×1254 | iOS now points to `assets/staff-icon-ios-1024.png`, an exact 1024×1024 opaque RGB export preserving the approved artwork. |
| Temporary-password enforcement only existed in the native staff app | The website root now blocks every route until `must_change_password` is cleared by the password update. |
| `@expo/vector-icons` had drifted to **15.1.1** on a `^15.0.3` caret | The exact drift that silently crashes these apps natively at launch. Now exact-pinned to `15.0.3`, matching customer-app. See the pin memo below |
| Top-level `icon` and `android.adaptiveIcon.foregroundImage` pointed at the non-square 954×948 `logo.png` | `ios.icon` was overriding it so iOS was safe, but the fallback was one deleted line away from shipping a rejected icon. Both now point at square 1024×1024 opaque assets |
| No `automaticallyAdjustKeyboardInsets` anywhere | Android resizes the window for the keyboard; **iOS overlays it**. Text fields in the lower half of six screens were unreachable — including the manual QR token field on CollectionScannerScreen, the documented fallback when scanning fails |

Verified already correct, no change needed:

- `ios.config.usesNonExemptEncryption: false` — skips the export-compliance prompt
- Permission strings for camera and photos, via the expo-camera/expo-image-picker plugins
- All icons 1024×1024, 8-bit **RGB with no alpha** (Apple rejects alpha)
- `SafeAreaView` from `react-native-safe-area-context` on every screen
- **No in-app account creation** — staff accounts are provisioned by admins, so
  Guideline 5.1.1(v) in-app account deletion does not apply to this app
- No tracking SDKs, so no App Tracking Transparency prompt is required
- Shipments search sits in a fixed header above the list, so the keyboard fix
  was not needed there

### customer-app, same pass

Also now **18/18** (was 16/18). Two fixes:

- Same non-square `logo.png` on `icon` and `adaptiveIcon.foregroundImage`. Fixed
  **differently** from the staff app on purpose: this app is live on Google Play
  with an `#008C45` green adaptive background that the logo's transparency shows
  through, so flattening onto white would visibly change the Play listing icon.
  `scripts/make-ios-icon.cjs` gained an `--alpha` flag that emits RGBA (colour
  type 6) instead of RGB; `icon-square.png` and `adaptive-icon.png` are square,
  padded, and still transparent. The opaque path is unchanged — regenerating
  `ios-icon.png` produces a byte-identical file.
- `customer-app/.expo/` was **committed**, so the root `.gitignore` rule could
  never take effect. Untracked with `git rm -r --cached` (files kept on disk).
  staff-app was already clean.

Still to do, outside the code:

- **Demo credentials** for Beta App Review — the app is login-gated and will be
  rejected without a working account
- Privacy policy URL: <https://zimbabweshipping.com/privacy-policy> (live, route
  exists in `src/App.tsx`)

---

## Step 0b — Our own Apple Developer Program (still the end goal)

Enrol at <https://developer.apple.com/programs/enroll/>.

- **£79 / $99 per year**, renews annually.
- **Organization** enrolment (recommended — apps list as "Zimbabwe Shipping
  Services" rather than a personal name) requires a free **D-U-N-S number** for
  the company. Requesting a D-U-N-S can take **up to 2 weeks**, and Apple's
  review of the enrolment adds a few more days. Start this first.
- **Individual** enrolment is approved in ~24–48h but the App Store shows your
  personal legal name as the seller.

Once approved, note your **Team ID** (Apple Developer portal → Membership).

## Step 1 — App Store Connect API key (so builds/submissions run unattended)

In App Store Connect → **Users and Access → Integrations → App Store Connect API**,
create a key with the **App Manager** role. You get:

- an **Issuer ID** (UUID),
- a **Key ID**,
- a one-time `.p8` download — **you cannot download it again**.

Store the `.p8` outside the repo (it is a private key; it must never be
committed). Point EAS at it once:

```bash
npx eas-cli credentials
```

Choose iOS → App Store Connect API Key → upload. EAS keeps it server-side from
then on.

## Step 2 — Create the App Store Connect app records

App Store Connect → **Apps → +**. For each app:

- Platform: iOS
- Name: `Zimbabwe Shipping` / `Zimbabwe Shipping Staff` (must be globally unique)
- Primary language: English (U.K.)
- Bundle ID: pick the matching one from the table above
- SKU: anything internal, e.g. `ZSS-CUSTOMER-001`

Copy the resulting **Apple ID** number (that is the `ascAppId`) into
`eas.json` → `submit.production.ios`, along with your Team ID. Both files
currently have placeholders.

## Step 3 — Build

```bash
cd customer-app && npx eas-cli build --platform ios --profile production
```

```bash
cd staff-app && npx eas-cli build --platform ios --profile production
```

First run asks to generate a **Distribution Certificate** and **Provisioning
Profile** — say yes, EAS creates and stores them. It also registers the bundle
IDs on the Apple Developer portal for you. Output is a `.ipa`.

`appVersionSource: "remote"` + `autoIncrement: true` means EAS owns the build
number; you never hand-edit it. Bump the user-facing `version` in
`staff-app/app.config.js` only for real staff-app releases.

## Step 4 — Submit to TestFlight / App Review

```bash
cd customer-app && npx eas-cli submit --platform ios --profile production --latest
```

The build lands in TestFlight within ~15–30 min of processing. Test it there
before promoting to review.

## Step 4b — Sign in with Apple (code is in, config is not)

The customer app now offers **Sign in with Apple** on iOS alongside email and
password. The native button appears on the Auth screen above "Create New
Account", and is hidden on Android and web.

Apple only *requires* this once an app offers a third-party social login
(Guideline 4.8) — email/password alone would not have forced it — but it is in
place now, so adding Google or Facebook login later carries no extra risk.

Three pieces of configuration are still outstanding, and **all of them need the
paid Developer Program membership from Step 0**:

1. **Apple Developer portal** — under Identifiers, edit
   `com.voyagetech.zimbabweshipphing` and tick the **Sign In with Apple**
   capability. `usesAppleSignIn: true` in `app.json` makes EAS request the
   matching entitlement at build time.
2. **Create a Sign in with Apple key** — Keys → **+** → tick Sign In with Apple,
   configure it against the primary App ID, download the `.p8`. Note the **Key
   ID** and your **Team ID**. Keep the `.p8` out of the repo.
   ⚠️ **The Keys section needs Admin or Account Holder.** On our current App
   Manager role (Step 0a) this one item has to be done by the account owner,
   who then sends us the `.p8`, Key ID and Team ID.
3. **Supabase** — Authentication → Providers → **Apple**: enable it, and in
   *Client IDs* add the bundle identifier `com.voyagetech.zimbabweshipphing`. The
   native flow sends Apple's identity token whose audience is the bundle ID, so
   this must match exactly or every sign-in fails with an audience error. Fill
   in Team ID, Key ID and the `.p8` contents in the Secret Key field.

Until step 3 is done, tapping the button surfaces a Supabase provider error.
There is nothing to test before then — the Apple sheet itself only appears on a
real device or simulator running a native build, never in Expo Go or on web.

### Two behaviours worth knowing

- **Apple returns the customer's name and email exactly once**, on the very
  first sign-in, and never again. `AuthContext.signInWithApple` persists them to
  `profiles` immediately for that reason. It will not overwrite details already
  on the profile, so someone who registered by email and later links Apple keeps
  what they had.
- **Customers may hide their real email.** Apple then issues a
  `@privaterelay.appleid.com` forwarding address. It is deliverable, but only
  from email domains registered with Apple — worth checking against whatever
  sends the booking confirmations before launch.

### Account deletion has an extra obligation — code is in, key is not

Apple requires apps offering Sign in with Apple to **revoke the Apple token**
when a customer deletes their account — not just delete the row (Guideline
5.1.1 (v)). Reviewers check this path, so it is a live rejection risk.

This is now implemented end to end. It is inert until the `.p8` key from item 2
exists and the four secrets below are set, at which point it starts working with
no code change.

**Why it needed a second edge function.** The app uses the *native* Apple flow,
where Supabase only ever receives the identity token. Supabase does not persist
a provider refresh token for that flow, so `auth.identities` holds nothing that
can be revoked. Apple's authorization code is the only thing that can be traded
for a refresh token, and it is single-use and expires after five minutes — so it
has to be exchanged during sign-in and the result stored by us.

The pieces:

| Piece | What it does |
|---|---|
| `supabase/functions/_shared/apple.ts` | Mints the ES256 client-secret JWT from the `.p8`; wraps Apple's `/auth/token` and `/auth/revoke` |
| `supabase/functions/apple-auth/` | `action: 'link'` exchanges the authorization code at sign-in and stores the refresh token; `action: 'setup'` applies the DDL |
| `public.apple_auth_tokens` | One row per Apple user. RLS on with **no policies** and grants revoked — service role only. Cascades away with the auth user |
| `AuthContext.signInWithApple` | Passes `credential.authorizationCode` to `apple-auth`, best effort — a failure there never blocks sign-in |
| `process-account-deletion` | Step 0: looks for an `apple` identity, revokes the stored token, stamps `apple_token_revoked_at`, and records the outcome in `notes` |

**Set these four secrets** once the key exists (they are read only by edge
functions; the `.p8` must never be committed):

```bash
supabase secrets set APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=YYYYYYYYYY APPLE_CLIENT_ID=com.voyagetech.zimbabweshipphing
```

Then the key itself, read from the downloaded file so the newlines survive:

```bash
supabase secrets set APPLE_PRIVATE_KEY="$(cat ~/Downloads/AuthKey_YYYYYYYYYY.p8)"
```

Deploy both functions:

```bash
supabase functions deploy apple-auth process-account-deletion
```

Then create the table by invoking the `setup` action from an admin session —
this project must never run `supabase db push`:

```ts
await supabase.functions.invoke('apple-auth', { body: { action: 'setup' } })
```

**Two deliberate behaviours**, both defensible if a reviewer asks:

- Revocation runs **before** anything is deleted. Deleting the auth user cascades
  the stored token away, after which revocation is impossible.
- A failed revocation **does not abort the deletion**. Erasure under GDPR
  Article 17 is a hard obligation with a deadline; an Apple token expires on its
  own. The failure reason lands in `account_deletion_requests.notes`, and
  `apple_token_revoked_at` stays null, so unrevoked deletions are easy to query.

Anyone who signs in with Apple *before* these secrets are set has no stored
token and so cannot have it revoked — the deletion notes say exactly that.
Since Apple sign-in cannot work at all until the Supabase provider is
configured, this only bites if the provider is switched on before the secrets
are set. Do both in the same sitting.

## Step 5 — App Store Connect metadata (the part that gets you rejected)

### Screenshots — generator built, needs a signed-in pass

The old `store-assets/` PNGs are **941 × 1672**, which App Store Connect
rejects. Required:

| Device class | Exact size (portrait) | Needed for |
|---|---|---|
| iPhone 6.9" | **1320 × 2868** | both apps (mandatory) |

1–10 per app. iPad screenshots are **not** required — `supportsTablet` is now
`false` on both apps, so the iPad size class is out of scope.

`scripts/store-screenshots/` generates these at the correct size: it drives the
Expo web build in headless Chrome, captures real screens, and composites them
into the branded frame with an iOS status bar and iPhone body. See
`scripts/store-screenshots/README.md`.

```bash
node scripts/store-screenshots/capture.mjs customer-app
```

```bash
node scripts/store-screenshots/render.mjs customer-app
```

**One manual step remains.** As a guest, Shipments/Billing show empty "sign in"
states and the staff app never leaves its login screen — poor store art. Run
once per app with `--login`, sign in yourself in the Chrome window that opens,
close it, then re-run the capture. The session persists in a gitignored profile;
no password touches the scripts or the repo.

```bash
node scripts/store-screenshots/capture.mjs customer-app --login
```

### Required fields

- **Privacy policy URL** — mandatory for every app.
- **Support URL** — a real page that answers questions.
- **App Privacy questionnaire** — the iOS equivalent of
  `GOOGLE_PLAY_DATA_SAFETY_ANSWERS.md`. Declare at minimum: email address, name,
  phone number, physical address, photos (proof-of-payment / proof-of-delivery
  uploads), and that they are linked to the user's identity.
- **Age rating**, **category** (Business or Travel fits both).
- **Export compliance** — already answered in code via
  `ITSAppUsesNonExemptEncryption: false`, so App Store Connect stops asking.

### App Review notes — provide a demo account

Both apps sit behind a login. **Reviews fail automatically without working
credentials.** In the "App Review Information" box, supply a real Supabase test
account (email + password) with data seeded, and for the staff app say which
role it has and how to reach the scanner and dashboards. Add a sentence
explaining the business: UK & Ireland → Zimbabwe door-to-door shipping,
6–8 weeks, physical freight — reviewers reject what they don't understand.

## Staff app — Custom App distribution (chosen route)

Apple routinely rejects **employee-only apps** from public App Store
distribution and redirects them to **Custom Apps**, distributed privately
through Apple Business Manager. That is the route for `staff-app`.

Extra setup on top of the steps above:

1. Enrol the company in **Apple Business Manager** at
   <https://business.apple.com> (free, separate from the Developer Program).
   You need the D-U-N-S number again and Apple verifies by phone — allow a few
   business days.
2. Link ABM to your Developer Program team, and note your **Organization ID**
   (ABM → Settings → Enrollment Information).
3. In App Store Connect, on the staff app's **Pricing and Availability** page,
   set distribution to **Custom App** and add your own organisation as the
   authorised buyer.
4. Build and submit exactly as in Steps 3–4. Review still happens, but against
   the custom-app bar — no "who is the public audience?" argument.
5. Staff install it from **Apple Business Manager → Apps**, or via a redemption
   link, not from the public App Store.

The staff app is login-gated, so it **still needs demo credentials** in the App
Review notes.

The customer app is genuinely consumer-facing and goes on the public App Store
normally.

---

## Known gaps still open

- [x] ~~Apple Developer Program access~~ — unblocked 2026-08-05 via App Manager
      access to a third party's team (Step 0a). Our own enrolment (Step 0b) is
      still worth finishing, since the app currently lives in their account
- [ ] Staff app onto iPhones: create the app record, build, submit, then
      **external** TestFlight + Beta App Review (Step 0a)
- [ ] Apple Business Manager enrolment, for the staff app's Custom App route —
      needs whichever organization owns the Developer account
- [ ] Replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` in `staff-app/eas.json`
      after creating the App Store Connect record. The staff Team ID is already
      configured as `4B9W3228Y2`.
- [ ] Screenshots: generator is built and producing 1320 × 2868 art in
      `store-assets/ios/`. Needs a `--login` pass so the list screens show real
      data instead of guest empty states.
- [ ] Sign in with Apple: capability + key on the Apple side, provider config in
      Supabase (Step 4b). Code is done; nothing works until these are set.
      The `.p8` needs Admin, so the account owner must create it for us.
- [ ] Apple token revocation on account deletion — code is done. Outstanding:
      the four `APPLE_*` edge function secrets, deploying `apple-auth` +
      `process-account-deletion`, and running the `setup` action to create
      `apple_auth_tokens` (Step 4b)
- [ ] Privacy policy + support URLs confirmed live
- [ ] Demo accounts created for App Review (both apps)

## Already handled in this repo

- **iOS app icons generated.** The staff app uses
  `assets/staff-icon-ios-1024.png`: 1024 × 1024,
  24-bit RGB, **no alpha**, brand logo flattened onto white. Regenerate with
  `node scripts/make-ios-icon.cjs <app>/assets/logo.png <app>/assets/ios-icon.png`.
  The previous `assets/icon.png` in both apps was the **stock Expo template
  icon** — shipping that would have put a blue placeholder chevron on the App
  Store — and `logo.png` is 954 × 948 with an alpha channel, which Apple
  rejects on both counts.
- `ITSAppUsesNonExemptEncryption: false` set on both apps, so App Store Connect
  stops asking about export compliance on every build.
- Customer app has an in-app **Delete my account** entry (Profile screen),
  required by Apple guideline 5.1.1(v) for any app offering registration. It
  opens <https://zimbabweshipping.com/delete-account>.
- **Staff native dependencies aligned to Expo SDK 57.** Expo Doctor validates
  the exact package set; do not reintroduce manual `expo-font` overrides.
- `staff-app/eas.json` created and the app linked to EAS project
  `2b720f8b-c079-497c-bcbe-003de4e27e89`.
- `supportsTablet` set to `false` on staff-app, dropping the iPad screenshot
  requirement.
- Root `.easignore` already keeps uploads small in this monorepo.

### Deliberately not changed

`android.adaptiveIcon.foregroundImage` and the top-level `icon` still point at
the non-square `logo.png`, so `expo-doctor` reports one schema warning per app.
Both Android apps are already live on Play with that artwork; swapping it would
change the shipped launcher icon. It has no effect on iOS, which now uses
`ios-icon.png`.

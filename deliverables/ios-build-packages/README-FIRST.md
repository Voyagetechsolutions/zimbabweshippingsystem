# iOS production build handoff

These are sanitized, self-contained Expo projects for the Apple Account Holder.
Local environment files, installed dependencies, caches, service-account files,
and Apple signing keys are intentionally excluded.

## Before building

1. Accept the Developer invitation to the `VTSAPPS2026` Expo account.
2. Install the current Node.js LTS release.
3. Extract both ZIP files.
4. Use the Apple Account Holder login when EAS asks to authenticate with Apple.

## Customer app

Bundle ID: `com.voyagetech.zimbabweshipphing`

```powershell
cd customer-app
npm install
npx eas-cli login
npx eas-cli build --platform ios --profile production
```

When prompted, allow EAS to generate and store the Apple Distribution
Certificate and App Store provisioning profile. Do not select the
`ios-simulator` profile; simulator builds cannot be uploaded to Apple.

## Staff app

Bundle ID: `com.zimbabweshipping.staff`

```powershell
cd staff-app
npm install
npx eas-cli login
npx eas-cli build --platform ios --profile production
```

Again, allow EAS to generate and store the Apple Distribution Certificate and
App Store provisioning profile. The matching bundle identifier must exist in
the Apple Developer account.

## Handoff after the builds

Send the finished EAS build URLs back to Voyage Tech. EAS stores the signing
credentials on the shared Expo account, so no Apple password, certificate,
private key, or provisioning-profile file needs to be sent separately.


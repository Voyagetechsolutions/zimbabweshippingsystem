// Central config for the mobile-app download links.
//
// ANDROID_APK_URL is the direct download for sideloading the Android app.
// Point it at wherever the .apk is hosted. Recommended: a public Supabase
// Storage bucket (stable URL, no repo bloat), e.g.
//   https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/downloads/zimbabwe-shipping.apk
//
// PLAY_STORE_URL is the Google Play listing — leave empty until the app is
// live on the store; the UI hides the Play button while it is empty.
export const ANDROID_APK_URL =
  'https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/downloads/zimbabwe-shipping.apk';

export const PLAY_STORE_URL = '';

// Shown next to the download so users know what they are getting.
export const ANDROID_APP_VERSION = '1.0.0';

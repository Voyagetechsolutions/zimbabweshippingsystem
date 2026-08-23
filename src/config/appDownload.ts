// Central config for the mobile-app download links.
//
// ANDROID_APK_URL is the direct download for sideloading the Android app.
// The .apk is served as a static asset from the site itself
// (public/downloads/zimbabwe-shipping.apk), so the URL is stable and branded.
// To publish a new version, rebuild the APK and replace that file.
//
// Verified public Google Play listing for the customer app.
export const ANDROID_APK_URL = '/downloads/zimbabwe-shipping.apk';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.zimbabweshipping.customer';

// Verified public Apple App Store listing. iOS apps cannot be sideloaded from
// the website, so customers are always sent to this listing.
export const APP_STORE_URL = 'https://apps.apple.com/app/id6798249540';

// Shown next to the Android download so users know what they are getting.
export const ANDROID_APP_VERSION = '1.0.0';

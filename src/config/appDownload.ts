// Central config for the mobile-app download links.
//
// ANDROID_APK_URL is the direct download for sideloading the Android app.
// The .apk is served as a static asset from the site itself
// (public/downloads/zimbabwe-shipping.apk), so the URL is stable and branded.
// To publish a new version, rebuild the APK and replace that file.
//
// PLAY_STORE_URL is the Google Play listing — leave empty until the app is
// live on the store; the UI hides the Play button while it is empty.
export const ANDROID_APK_URL = '/downloads/zimbabwe-shipping.apk';

export const PLAY_STORE_URL = '';

// Shown next to the download so users know what they are getting.
export const ANDROID_APP_VERSION = '1.0.0';

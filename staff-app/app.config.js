// Dynamic Expo config kept in one file so EAS and Expo Doctor evaluate the
// exact same release metadata. Secrets stay in EAS environment variables.
// Expo's web bundle and the native Android manifest must receive the same
// restricted Maps key. Local development keeps it in the EXPO_PUBLIC name,
// while EAS can provide the non-public alias as a build environment secret.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: 'Zimbabwe Shipping Staff',
    slug: 'zimbabwe-shipping-staff',
    description: 'Secure operations, finance and driver tools for Zimbabwe Shipping staff.',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/staff-icon-v2.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/staff-splash-v2.png',
      resizeMode: 'contain',
      backgroundColor: '#03162f',
    },
    plugins: [
      'expo-font',
      'expo-sharing',
      'expo-status-bar',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Zimbabwe Shipping Staff to scan shipment QR codes.',
          recordAudioAndroid: false,
          barcodeScannerEnabled: true,
        },
      ],
      [
        'expo-image-picker',
        {
          cameraPermission: 'Allow Zimbabwe Shipping Staff to photograph goods as collection and delivery proof.',
          photosPermission: 'Allow Zimbabwe Shipping Staff to access proof photographs.',
          microphonePermission: false,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Zimbabwe Shipping to share your route location with dispatch only while you are online and working.',
          locationWhenInUsePermission: 'Allow Zimbabwe Shipping to use your location for navigation, arrivals and route operations.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.zimbabweshipping.staff',
      icon: './assets/staff-icon-ios-1024.png',
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.zimbabweshipping.staff',
      adaptiveIcon: {
        backgroundColor: '#03162f',
        foregroundImage: './assets/staff-icon-v2.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      ...(googleMapsApiKey ? { config: { googleMaps: { apiKey: googleMapsApiKey } } } : {}),
    },
    web: {
      favicon: './assets/staff-icon-v2.png',
    },
    owner: 'vtsapps2026',
    extra: {
      eas: {
        projectId: '2b720f8b-c079-497c-bcbe-003de4e27e89',
      },
    },
  },
};

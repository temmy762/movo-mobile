/**
 * Adds secrets to app.json at build time — never commit keys.
 * GOOGLE_MAPS_ANDROID_API_KEY: Google Maps SDK for Android key (restricted to
 * com.movoprive.app), set as an EAS environment variable. Expo Go uses its own
 * key, so local development works without it. iOS uses Apple Maps.
 * GOOGLE_SERVICES_JSON: path to the Firebase google-services.json (an EAS
 * "file" environment variable) — Android push notifications need it.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
  },
  plugins: [
    ...(config.plugins ?? []),
    ["react-native-maps", { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
  ],
});

/**
 * Adds secrets to app.json at build time — never commit keys.
 * GOOGLE_MAPS_ANDROID_API_KEY: Google Maps SDK for Android key (restricted to
 * com.movoprive.chauffeur). Set it as an EAS environment variable. Expo Go
 * uses its own key, so local development works without it. iOS uses Apple Maps.
 */
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ["react-native-maps", { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
  ],
});

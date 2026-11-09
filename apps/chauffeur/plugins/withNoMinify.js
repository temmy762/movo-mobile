/**
 * Turns off R8 (code shrinking) for Android release builds.
 * The Expo 58 template enables it, and R8 strips the Room database class that
 * WorkManager (used by expo-notifications / background tasks) loads by name, so
 * the app crashed on launch: "Failed to create an instance of class
 * androidx.work.impl.WorkDatabase". Re-enable only with tested keep rules.
 */
const { withGradleProperties } = require("expo/config-plugins");

const KEY = "android.enableMinifyInReleaseBuilds";

module.exports = function withNoMinify(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((p) => !(p.type === "property" && p.key === KEY));
    cfg.modResults.push({ type: "property", key: KEY, value: "false" });
    return cfg;
  });
};

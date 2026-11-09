/**
 * Skips Android "lint vital" on release builds.
 * @stripe/stripe-react-native declares stripe-android-issuing-push-provisioning
 * as compileOnly; its dependency play-services-tapandpay isn't on public Maven,
 * so the library's lintVitalAnalyzeRelease task can't resolve its classpath and
 * the EAS build fails. Lint doesn't affect the app — the build does.
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// movo: no release lint";

module.exports = function withNoReleaseLint(config) {
  return withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (!src.includes(MARKER)) {
      cfg.modResults.contents = src.replace(
        /\nandroid\s*\{/,
        (m) => `${m}\n    ${MARKER}\n    lint {\n        checkReleaseBuilds false\n        abortOnError false\n    }`,
      );
    }
    return cfg;
  });
};

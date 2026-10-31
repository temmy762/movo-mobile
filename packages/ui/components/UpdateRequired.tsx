/* Full-screen "please update" shown when this build is older than the
   server's minimum (GET /api/app/config → minVersion) */
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors, fonts } from "../tokens";

export function UpdateRequired({ appName, iosStoreUrl, androidPackage }: {
  appName: string; iosStoreUrl?: string; androidPackage: string;
}) {
  const open = () =>
    Linking.openURL(Platform.OS === "ios"
      ? iosStoreUrl ?? "https://apps.apple.com/"
      : `https://play.google.com/store/apps/details?id=${androidPackage}`);
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Update required</Text>
      <Text style={styles.body}>
        This version of {appName} is no longer supported. Please update to the latest version to keep using the app.
      </Text>
      <Button title="Update now" onPress={open} style={{ alignSelf: "stretch" }} />
    </View>
  );
}

/** "1.2.10" < "1.10.0" — numeric, part by part */
export function isOlder(version: string, min: string): boolean {
  const a = version.split(".").map((n) => parseInt(n, 10) || 0);
  const b = min.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14, backgroundColor: colors.background },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.navy },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20, marginBottom: 8 },
});

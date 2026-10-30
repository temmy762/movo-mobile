/* Back button + title for screens pushed over the tabs */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Icon, fonts } from "@movo/ui";

export function ScreenHeader({ title, subtitle, fallback = "/" }: { title: string; subtitle?: string; fallback?: Href }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))} style={styles.back}
        accessibilityRole="button" accessibilityLabel="Back">
        <Icon name="back" size={18} color="#374151" strokeWidth={2.5} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.heading, fontSize: 17, color: "#111827" },
  subtitle: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af" },
});

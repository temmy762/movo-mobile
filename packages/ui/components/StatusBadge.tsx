import { StyleSheet, Text } from "react-native";
import { fontSizes, fonts, radii, statusColors } from "../tokens";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = statusColors[status] ?? { bg: "#f3f4f6", color: "#6b7280", label: status };
  return <Text style={[styles.badge, { backgroundColor: s.bg, color: s.color }]}>{label ?? s.label}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    fontSize: fontSizes.xs,
    fontFamily: fonts.bodySemi,
  },
});

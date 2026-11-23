/* Unread count bubble for the chat button (hidden at 0; "9+" above nine) */
import { StyleSheet, Text, View } from "react-native";
import { fonts } from "@movo/ui";

export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={s.badge} pointerEvents="none" accessibilityLabel={`${count} unread`}>
      <Text style={s.text}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: "#EF4444", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  text: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#fff", lineHeight: 13 },
});

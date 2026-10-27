/* Dark chauffeur theme from the web home, shared by the Home cards */
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@movo/ui";

export const dark = {
  bg: "#0A0A0F",
  card: "#14141C",
  cardBorder: "rgba(255,255,255,0.08)",
  offerBorder: "rgba(198,191,178,0.45)",
  text: "#FFFFFF",
  dim: "rgba(255,255,255,0.45)",
  soft: "rgba(255,255,255,0.75)",
  green: "#4ade80",
};

export const gradient = ["#1a1a2e", "#131936", "#C6BFB2"] as const;

export const money = (n: number | undefined) => `$${(n ?? 0).toFixed(2)}`;

export function Route({ pickup, dropoff, stops = [] }: { pickup: string; dropoff: string; stops?: string[] }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={kit.routeRow}>
        <View style={[kit.dot, { backgroundColor: colors.taupe }]} />
        <Text style={kit.routeText}>{pickup}</Text>
      </View>
      {stops.map((s, i) => (
        <View key={`${i}-${s}`} style={kit.routeRow}>
          <View style={[kit.dot, { backgroundColor: "rgba(255,255,255,0.35)" }]} />
          <Text style={kit.routeText}>Stop {i + 1}: {s}</Text>
        </View>
      ))}
      <View style={kit.routeRow}>
        <View style={[kit.dot, { backgroundColor: "#ef4444" }]} />
        <Text style={kit.routeText}>{dropoff}</Text>
      </View>
    </View>
  );
}

export const kit = StyleSheet.create({
  card: { backgroundColor: dark.card, borderWidth: 1, borderColor: dark.cardBorder, borderRadius: 16, padding: 16 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: dark.text },
  dim: { fontFamily: fonts.body, fontSize: 11, color: dark.dim },
  chips: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rider: { fontFamily: fonts.bodySemi, fontSize: 13, color: dark.text },
  earningsValue: { fontFamily: fonts.heading, fontSize: 15, color: colors.taupe },
  routeRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: dark.soft, lineHeight: 16 },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnOutline: { borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

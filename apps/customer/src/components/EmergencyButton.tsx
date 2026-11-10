/**
 * In-ride Emergency (SOS): "Call 911" or "Alert Movo" — the second logs an
 * incident and alerts Movo's admins at once with the ride and a map link
 * (POST /api/sos). Shown only while a ride is live.
 */
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text } from "react-native";
import * as Location from "expo-location";
import { safety } from "@movo/api";
import { fonts } from "@movo/ui";

async function currentCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = (await Location.getLastKnownPositionAsync({ maxAge: 60_000 }))
      ?? (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]));
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

export function EmergencyButton({ bookingId }: { bookingId: string }) {
  const [sending, setSending] = useState(false);

  const alertMovo = async () => {
    setSending(true);
    try {
      await safety.sos(bookingId, await currentCoords());
      Alert.alert("Movo has been alerted", "Our team can see your ride and location and will contact you right away. If you're in danger, call 911.");
    } catch {
      Alert.alert("Couldn't reach Movo", "Please call 911 if you need help.", [
        { text: "Call 911", style: "destructive", onPress: () => Linking.openURL("tel:911") },
        { text: "Close", style: "cancel" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const open = () =>
    Alert.alert(
      "Emergency",
      "If you or anyone is in danger, call 911 first. You can also alert Movo — we'll see your ride and location right away.",
      [
        { text: "Call 911", style: "destructive", onPress: () => Linking.openURL("tel:911") },
        { text: "Alert Movo", onPress: alertMovo },
        { text: "Close", style: "cancel" },
      ],
    );

  return (
    <Pressable onPress={open} disabled={sending} style={({ pressed }) => [s.pill, (pressed || sending) && { opacity: 0.6 }]}
      accessibilityRole="button" accessibilityLabel="Emergency">
      <Text style={s.text}>{sending ? "Alerting…" : "SOS"}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca" },
  text: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#dc2626", letterSpacing: 0.5 },
});

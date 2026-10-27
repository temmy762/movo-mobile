/**
 * The chauffeur's vehicle — mirrors movo-web driver/home/profile/vehicle.
 * Read-only: changes go through Movo (vehicle details are verified).
 */
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { driver as driverApi } from "@movo/api";
import { serviceLabel } from "@movo/shared";
import { Card, colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { emailSupport } from "@/lib/links";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function Vehicle() {
  const query = useQuery({ queryKey: ["vehicle"], queryFn: driverApi.vehicle });
  const v = query.data?.vehicle;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="My Vehicle" fallback="/profile" />
      <ScrollView contentContainerStyle={styles.page}>
        {query.isPending ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.navy} />
        ) : v ? (
          <>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {v.photoUrl ? (
                <Image source={{ uri: v.photoUrl }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.noPhoto]}><Text style={styles.muted}>No photo uploaded</Text></View>
              )}
              <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                <Row label="Make" value={v.make} />
                <Row label="Model" value={v.model} />
                <Row label="Year" value={String(v.year)} />
                <Row label="Plate" value={v.plate} />
                <Row label="Service" value={serviceLabel(v.tier)} />
              </View>
            </Card>
            <Text style={[styles.muted, { textAlign: "center" }]} onPress={() => emailSupport("Vehicle update")}>
              To change your vehicle, contact Movo support.
            </Text>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No vehicle registered</Text>
            <Text style={styles.muted}>Complete onboarding to add your vehicle.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 14, paddingBottom: 40 },
  photo: { width: "100%", height: 180 },
  noPhoto: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  label: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280" },
  value: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#9ca3af" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 48 },
  emptyTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#374151" },
});

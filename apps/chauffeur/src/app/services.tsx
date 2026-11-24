/**
 * The driver's services — mirrors movo-web driver/home/services.
 * City Rides come with being a chauffeur; Safe Ride and Movo Courier need the
 * Movo team's approval (request here), then the driver switches them on/off.
 * Courier drivers do Movo Courier only.
 */
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { driver as driverApi } from "@movo/api";
import { Card, colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CourierAgreementForm } from "@/components/CourierAgreementForm";

type Key = "SAFE_RIDE" | "COURIER";
type ServiceState = driverApi.ServiceState;

/* Placeholder copy — Movo will supply the final eligibility wording */
const INFO: Record<Key, { title: string; desc: string; eligibility: string }> = {
  SAFE_RIDE: {
    title: "Safe Ride",
    desc: "Drive customers home in their own car, with a support chauffeur following.",
    eligibility: "Approved by the Movo team. You must be comfortable driving customers' vehicles.",
  },
  COURIER: {
    title: "Movo Courier",
    desc: "Same-day package deliveries between Winnipeg and nearby towns.",
    eligibility: "Approved by the Movo team.",
  },
};

type Extra = { agreementName: string; insuranceConfirmed: true };
function ServiceCard({ k, st, busy, act }: { k: Key; st: ServiceState; busy: boolean; act: (k: Key, a: "request" | "on" | "off", extra?: Extra) => void }) {
  const info = INFO[k];
  const approved = st.access === "APPROVED";
  /* Courier: sign the Courier Driver Agreement with the request */
  const [signing, setSigning] = useState(false);
  return (
    <Card style={{ gap: 6 }}>
      <View style={styles.between}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.muted}>{info.desc}</Text>
        </View>
        {approved && (
          <Switch value={st.enabled} disabled={busy} onValueChange={(v) => act(k, v ? "on" : "off")}
            trackColor={{ true: colors.navy }} accessibilityLabel={info.title} />
        )}
      </View>
      {st.access === "NONE" && <Text style={styles.small}>{info.eligibility}</Text>}
      {st.access === "REQUESTED" && <Text style={styles.pending}>Requested — the Movo team will review it and let you know.</Text>}
      {st.access === "DECLINED" && <Text style={styles.small}>Your last request wasn&apos;t approved. You can ask again, or contact the Movo team.</Text>}
      {(st.access === "NONE" || st.access === "DECLINED") && signing && (
        <CourierAgreementForm busy={busy} onCancel={() => setSigning(false)} onSubmit={(v) => act(k, "request", v)} />
      )}
      {(st.access === "NONE" || st.access === "DECLINED") && !signing && (
        <Pressable disabled={busy} onPress={() => (k === "COURIER" ? setSigning(true) : act(k, "request"))} style={[styles.btn, busy && { opacity: 0.5 }]} accessibilityRole="button">
          <Text style={styles.btnText}>{st.access === "DECLINED" ? "Request again" : "Request access"}</Text>
        </Pressable>
      )}
      {approved && !st.enabled && <Text style={styles.small}>Switch it on to start getting {info.title} requests.</Text>}
      {approved && st.enabled && k === "COURIER" && (
        <Text style={styles.link} onPress={() => router.navigate("/deliveries")}>Open deliveries →</Text>
      )}
    </Card>
  );
}

export default function Services() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["driver-services"], queryFn: driverApi.services });
  const [busy, setBusy] = useState(false);
  const s = q.data;

  const act = async (k: Key, a: "request" | "on" | "off", extra?: Extra) => {
    setBusy(true);
    try {
      qc.setQueryData(["driver-services"], await driverApi.setService(k, a, extra));
      qc.invalidateQueries({ queryKey: ["courier-driver"] });
    } catch (e) {
      Alert.alert("Couldn't update", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="My services" fallback="/profile" />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.muted}>Choose the work you get requests for.</Text>
        {!s ? (
          q.isError ? <Text style={styles.muted}>Couldn&apos;t load your services. Please try again.</Text> : <ActivityIndicator style={{ marginTop: 32 }} color={colors.navy} />
        ) : (
          <>
            {s.kind === "COURIER" ? (
              <Card style={{ gap: 4, borderWidth: 1, borderColor: colors.taupe }}>
                <Text style={styles.title}>Courier driver</Text>
                <Text style={styles.muted}>You get Movo Courier deliveries only — not City Rides or Safe Rides.</Text>
              </Card>
            ) : (
              <Card style={styles.between}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>City Rides</Text>
                  <Text style={styles.muted}>Rides in your vehicle class. Go online from Home.</Text>
                </View>
                <Text style={styles.included}>Included</Text>
              </Card>
            )}
            {s.safeRide.available && <ServiceCard k="SAFE_RIDE" st={s.safeRide} busy={busy} act={act} />}
            <ServiceCard k="COURIER" st={s.courier} busy={busy} act={act} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  small: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", marginTop: 4 },
  pending: { fontFamily: fonts.body, fontSize: 12, color: "#6b5f4a", backgroundColor: "#f7f5f1", borderRadius: 10, padding: 10, marginTop: 6 },
  btn: { marginTop: 8, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
  link: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy, marginTop: 6 },
  included: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy },
});

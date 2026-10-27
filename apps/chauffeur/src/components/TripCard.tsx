/**
 * Active standard ride on Home: head to pickup → I've Arrived (waiting clock)
 * → Start Ride → End Ride → rate the rider. Mirrors the web chauffeur home.
 */
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DriverBooking } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useTrip } from "@/lib/useTrip";
import { emailSupport } from "@/lib/links";
import { Route, dark, gradient, kit, money } from "./homeKit";

function openNavigation(destination: string) {
  const dest = encodeURIComponent(destination);
  Linking.openURL(Platform.OS === "ios" ? `maps://?daddr=${dest}` : `https://www.google.com/maps/dir/?api=1&destination=${dest}`);
}

function GradientButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ flex: 1 }} accessibilityRole="button">
      {disabled ? (
        <View style={[kit.btn, { backgroundColor: "#4b5563" }]}><Text style={kit.btnText}>{title}</Text></View>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={kit.btn}>
          <Text style={kit.btnText}>{title}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function SquareButton({ icon, label, onPress }: { icon: "navigation" | "phone"; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[kit.btnOutline, styles.square]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={18} color={dark.soft} />
    </Pressable>
  );
}

export function TripCard({ booking, onFinished }: {
  booking: DriverBooking;
  /** handedBack: the chauffeur cancelled and the ride went to someone else */
  onFinished: (handedBack: boolean) => void;
}) {
  const trip = useTrip(booking);
  const [showCancel, setShowCancel] = useState(false);
  const phone = booking.riderPhone ?? booking.user?.phone;
  const number = booking.bookingNumber ?? booking.id.slice(0, 8);
  const beforeStart = trip.step === "accepted" || trip.step === "arrived";
  const destination = beforeStart ? booking.pickup : trip.route.dropoff;

  const title = trip.step === "accepted" ? "Ride Accepted — head to pickup"
    : trip.step === "arrived" ? "Arrived at Pickup"
    : "Trip in progress";

  return (
    <View style={[kit.card, { borderColor: dark.offerBorder, gap: 12 }]}>
      <View style={kit.chips}>
        <Icon name="check" size={16} color={dark.green} />
        <Text style={kit.cardTitle}>{title}</Text>
        <Text style={[kit.dim, { marginLeft: "auto" }]}>#{number}</Text>
      </View>

      <View style={kit.between}>
        <View style={{ flex: 1 }}>
          <Text style={kit.rider}>{booking.clientName}</Text>
          <Text style={kit.dim}>{booking.carName}{booking.passengers ? ` · ${booking.passengers} passenger${booking.passengers > 1 ? "s" : ""}` : ""}</Text>
        </View>
        <Text style={kit.earningsValue}>{money(booking.earning)}</Text>
      </View>

      <Route pickup={booking.pickup} dropoff={trip.route.dropoff} stops={trip.route.stops} />
      {booking.pickupInstructions && beforeStart ? (
        <Text style={kit.dim}>Pickup note: {booking.pickupInstructions}</Text>
      ) : null}

      {trip.routeNotice && (
        <Pressable onPress={trip.clearRouteNotice} style={[styles.banner, styles.bannerGold]}>
          <Icon name="alert" size={14} color={colors.taupe} />
          <Text style={[styles.bannerText, { color: colors.taupe }]}>{trip.routeNotice}</Text>
        </Pressable>
      )}

      {trip.error && (
        <Pressable onPress={trip.clearError} style={[styles.banner, styles.bannerRed]}>
          <Text style={[styles.bannerText, { color: "#f87171" }]}>{trip.error}</Text>
        </Pressable>
      )}

      {trip.step === "arrived" && (
        <>
          <View style={[styles.banner, styles.bannerGreen]}>
            <Icon name="check" size={14} color={dark.green} strokeWidth={2.5} />
            <Text style={[styles.bannerText, { color: dark.green }]}>You&apos;re at the pickup location</Text>
          </View>
          {trip.waiting && (trip.waiting.freeLeft > 0 ? (
            <View style={[styles.banner, styles.between]}>
              <Text style={[styles.bannerText, { color: dark.soft }]}>Complimentary waiting</Text>
              <Text style={styles.clock}>
                {Math.floor(trip.waiting.freeLeft / 60)}:{String(trip.waiting.freeLeft % 60).padStart(2, "0")} left
              </Text>
            </View>
          ) : (
            <View style={[styles.banner, styles.bannerAmber, styles.between]}>
              <Text style={[styles.bannerText, { color: "#fbbf24" }]}>
                Wait charges accruing (${trip.waiting.rate.toFixed(2)}/min)
              </Text>
              <Text style={[styles.clock, { color: "#fbbf24" }]}>${trip.waiting.accrued.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.actions}>
        {phone && trip.step !== "started" ? (
          <SquareButton icon="phone" label="Call rider" onPress={() => Linking.openURL(`tel:${phone}`)} />
        ) : null}
        <SquareButton icon="navigation" label={beforeStart ? "Navigate to pickup" : "Navigate to destination"}
          onPress={() => openNavigation(destination)} />
        {trip.step === "accepted" && (
          <GradientButton title={trip.busy ? "Saving…" : "I've Arrived at Pickup"} onPress={trip.arrive} disabled={trip.busy} />
        )}
        {trip.step === "arrived" && (
          <GradientButton title={trip.busy ? "Starting…" : "Start Ride"} onPress={trip.start} disabled={trip.busy} />
        )}
        {(trip.step === "started" || trip.step === "completed") && (
          <GradientButton title={trip.busy ? "Saving…" : "End Ride"} onPress={trip.complete} disabled={trip.busy || trip.step === "completed"} />
        )}
      </View>

      {beforeStart && (
        <Pressable onPress={() => setShowCancel(true)} style={[styles.redOutline]} accessibilityRole="button">
          <Text style={styles.redText}>Can&apos;t make this ride — Cancel</Text>
        </Pressable>
      )}
      {trip.step === "started" && (
        <Pressable onPress={() => emailSupport(`Incident report — ride #${number}`)} style={styles.redOutline} accessibilityRole="button">
          <Text style={styles.redText}>Report Incident</Text>
        </Pressable>
      )}

      <CancelModal visible={showCancel} busy={trip.busy} error={showCancel ? trip.error : null}
        onKeep={() => { setShowCancel(false); trip.clearError(); }}
        onConfirm={async (reason) => {
          if (await trip.cancel(reason)) {
            setShowCancel(false);
            onFinished(true);
          }
        }} />

      <RatingModal visible={trip.step === "completed"}
        onDone={async (rating, feedback) => {
          await trip.rate(rating, feedback);
          onFinished(false);
        }} />
    </View>
  );
}

/* Backing out before the trip starts: the ride is released to another
   chauffeur — not cancelled or refunded for the rider. */
function CancelModal({ visible, busy, error, onKeep, onConfirm }: {
  visible: boolean; busy: boolean; error: string | null; onKeep: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.badge, { backgroundColor: "#fef2f2" }]}>
            <Icon name="alert" size={22} color="#dc2626" />
          </View>
          <Text style={styles.sheetTitle}>Cancel this ride?</Text>
          <Text style={styles.sheetBody}>
            We&apos;ll automatically find another available chauffeur nearby — the rider will be told we&apos;re arranging this, not that their ride was cancelled.
          </Text>
          <TextInput value={reason} onChangeText={setReason} multiline maxLength={500}
            placeholder="Reason (optional) — e.g. vehicle issue, running too late" placeholderTextColor="#9ca3af"
            style={styles.textarea} />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.row}>
            <Pressable onPress={onKeep} disabled={busy} style={[styles.sheetBtn, styles.sheetBtnOutline]}>
              <Text style={[styles.sheetBtnText, { color: "#374151" }]}>Keep Ride</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(reason)} disabled={busy}
              style={[styles.sheetBtn, { backgroundColor: "#dc2626", opacity: busy ? 0.6 : 1 }]}>
              <Text style={styles.sheetBtnText}>{busy ? "Cancelling…" : "Yes, Cancel"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RatingModal({ visible, onDone }: { visible: boolean; onDone: (rating: number, feedback: string) => Promise<void> }) {
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const needsFeedback = rating <= 3 && !feedback.trim();

  const submit = async () => {
    setSaving(true);
    await onDone(rating, feedback);
    setSaving(false);
    setRating(4);
    setFeedback("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Trip Complete</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setRating(s)} hitSlop={4} accessibilityLabel={`${s} star${s > 1 ? "s" : ""}`}>
                <Icon name="star" size={30} strokeWidth={1.5}
                  color={s <= rating ? "#f59e0b" : "#d1d5db"} fill={s <= rating ? "#f59e0b" : "none"} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.sheetBody}>Trip completed — rate your rider.</Text>
          <TextInput value={feedback} onChangeText={setFeedback} multiline maxLength={1000}
            placeholder={rating <= 3 ? "Required: what went wrong with this rider?" : "Notes about this rider (optional)…"}
            placeholderTextColor="#9ca3af"
            style={[styles.textarea, needsFeedback && { borderColor: "#f59e0b" }]} />
          {needsFeedback && <Text style={styles.warnText}>Feedback is required for ratings of 3 stars or lower.</Text>}
          <Pressable onPress={submit} disabled={needsFeedback || saving} style={{ alignSelf: "stretch" }}>
            {needsFeedback || saving ? (
              <View style={[styles.sheetBtn, { backgroundColor: "#9ca3af" }]}>
                <Text style={styles.sheetBtnText}>{saving ? "Saving…" : "Ok"}</Text>
              </View>
            ) : (
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sheetBtn}>
                <Text style={styles.sheetBtnText}>Ok</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  square: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" },
  between: { justifyContent: "space-between" },
  bannerGreen: { backgroundColor: "rgba(74,222,128,0.1)" },
  bannerAmber: { backgroundColor: "rgba(251,191,36,0.1)" },
  bannerRed: { backgroundColor: "rgba(248,113,113,0.12)" },
  bannerGold: { backgroundColor: "rgba(198,191,178,0.12)" },
  bannerText: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 12 },
  clock: { fontFamily: fonts.heading, fontSize: 13, color: colors.taupe },
  redOutline: { paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.4)", backgroundColor: "rgba(248,113,113,0.08)", alignItems: "center" },
  redText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#f87171" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 24 },
  sheet: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 16, color: "#111827", marginBottom: 6 },
  sheetBody: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 14, lineHeight: 18 },
  stars: { flexDirection: "row", gap: 6, marginVertical: 8 },
  textarea: { alignSelf: "stretch", minHeight: 64, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 13, color: "#374151", textAlignVertical: "top", marginBottom: 10 },
  errorText: { alignSelf: "stretch", fontFamily: fonts.body, fontSize: 11, color: "#dc2626", marginBottom: 10 },
  warnText: { alignSelf: "stretch", fontFamily: fonts.body, fontSize: 11, color: "#d97706", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  sheetBtn: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  sheetBtnOutline: { borderWidth: 1, borderColor: "#d1d5db" },
  sheetBtnText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#fff" },
});

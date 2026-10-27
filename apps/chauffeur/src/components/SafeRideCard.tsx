/**
 * Safe Ride on Home — the incoming offer and every step after it, for both
 * roles. Mirrors the Care panels of the web chauffeur home.
 */
import type { ReactNode } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import type { CoDriver } from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { needsSetOff, type useSafeRide } from "@/lib/useSafeRide";
import { stopsOf } from "@/lib/useTrip";
import { Route, dark, kit, money } from "./homeKit";
import {
  Banner, GradientButton, OutlineButton, RatingModal, SquareButton, WaitingBanner,
  callNumber, openNavigation, parts,
} from "./tripParts";

type SafeRide = ReturnType<typeof useSafeRide>;

const roleLabel = (role: "PRIMARY" | "SUPPORT") => (role === "PRIMARY" ? "Primary Chauffeur" : "Support Chauffeur");

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: "America/Winnipeg", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Header({ role, right }: { role: "PRIMARY" | "SUPPORT"; right?: ReactNode }) {
  return (
    <View style={kit.chips}>
      <Text style={{ fontSize: 14 }}>🌟</Text>
      <Text style={kit.cardTitle}>Safe Ride</Text>
      <Text style={styles.chipGold}>{roleLabel(role)}</Text>
      {right}
    </View>
  );
}

/* PRIMARY drives the customer's route; SUPPORT meets PRIMARY at the
   destination, then drives them back to the pickup (their own vehicle). */
function CareRoute({ safe }: { safe: SafeRide }) {
  const a = safe.assignment!;
  if (a.role === "PRIMARY") {
    return <Route pickup={a.booking.pickup} dropoff={a.booking.dropoff} stops={stopsOf(a.booking.stops)} />;
  }
  const returning = safe.phase === "started";
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.routeLabel}>{returning ? "Returning Primary to their vehicle" : "Rendezvous at destination"}</Text>
      <View style={kit.routeRow}>
        <View style={[kit.dot, { backgroundColor: colors.taupe }]} />
        <Text style={kit.routeText}>{returning ? a.booking.pickup : a.booking.dropoff}</Text>
      </View>
    </View>
  );
}

const CO_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Awaiting acceptance…", color: dark.dim },
  ACCEPTED: { label: "En route", color: "#fbbf24" },
  ARRIVED: { label: "Arrived at rendezvous", color: "#60a5fa" },
  STARTED: { label: "In transit", color: dark.green },
  AWAITING_RETURN: { label: "Customer delivered — ready for pickup", color: dark.green },
  COMPLETED: { label: "Done", color: dark.green },
};

function CoDriverRow({ co }: { co: CoDriver }) {
  const status = CO_STATUS[co.status] ?? { label: co.status, color: dark.dim };
  const v = co.driver.vehicle;
  return (
    <View style={styles.coRow}>
      <View style={styles.avatar}>
        {co.driver.photoUrl
          ? <Image source={{ uri: co.driver.photoUrl }} style={styles.avatarImg} />
          : <Icon name="user" size={18} color={dark.dim} strokeWidth={1.5} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={kit.rider} numberOfLines={1}>{co.driver.firstName} {co.driver.lastName}</Text>
        <Text style={kit.dim} numberOfLines={1}>
          {roleLabel(co.role)}{v ? ` · ${v.make ?? ""} ${v.model ?? ""}` : ""}
        </Text>
        <Text style={[styles.coStatus, { color: status.color }]}>{status.label}</Text>
      </View>
      {co.driver.phone ? (
        <SquareButton icon="phone" label={`Call ${co.driver.firstName}`} onPress={() => callNumber(co.driver.phone!)} />
      ) : null}
    </View>
  );
}

export function SafeRideOffer({ safe }: { safe: SafeRide }) {
  const a = safe.assignment!;
  return (
    <View style={[kit.card, { borderColor: dark.offerBorder, gap: 12 }]}>
      <Header role={a.role} right={
        <Text style={[styles.countdown, safe.timeLeft <= 10 && { color: "#f87171" }]}>{safe.timeLeft}s</Text>
      } />
      {a.booking.scheduledAt && <Text style={styles.when}>{whenLabel(a.booking.scheduledAt)}</Text>}
      <View>
        <Text style={kit.rider}>{a.booking.clientName}</Text>
        <Text style={kit.dim}>Booking #{a.booking.bookingNumber ?? a.booking.id.slice(0, 8)}</Text>
      </View>
      <CareRoute safe={safe} />
      <View style={styles.earnings}>
        <Text style={styles.earningsLabel}>Est. Fare (your earnings)</Text>
        <Text style={kit.earningsValue}>{money(safe.earning)}</Text>
      </View>
      {safe.error && <Banner tone="red">{safe.error}</Banner>}
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${(safe.timeLeft / 30) * 100}%` }]} />
      </View>
      <View style={parts.actions}>
        <OutlineButton title="Decline" onPress={safe.decline} disabled={safe.busy} />
        <GradientButton title={safe.busy ? "…" : "Accept"} onPress={safe.accept} disabled={safe.busy} />
      </View>
    </View>
  );
}

export function SafeRideCard({ safe }: { safe: SafeRide }) {
  const a = safe.assignment!;
  const primary = a.role === "PRIMARY";
  const phone = a.booking.riderPhone ?? a.booking.user?.phone;
  const uberReturn = a.booking.returnMode === "UBER";
  /* SUPPORT may collect PRIMARY only once the customer is delivered */
  const waitingOnPrimary = !primary && safe.coDriver?.status !== "AWAITING_RETURN";
  const navTarget = primary
    ? (safe.phase === "started" ? a.booking.dropoff : a.booking.pickup)
    : (safe.phase === "started" ? a.booking.pickup : a.booking.dropoff);

  return (
    <View style={[kit.card, { borderColor: dark.offerBorder, gap: 12 }]}>
      <Header role={a.role} right={
        <Text style={[kit.dim, { marginLeft: "auto" }]}>#{a.booking.bookingNumber ?? a.booking.id.slice(0, 8)}</Text>
      } />

      {safe.coDriver ? <CoDriverRow co={safe.coDriver} /> : primary && !uberReturn && safe.phase !== "completed" ? (
        <Banner tone="amber" right={<ActivityIndicator size="small" color="#fbbf24" />}>Searching for a support chauffeur…</Banner>
      ) : null}

      <CareRoute safe={safe} />

      <View style={kit.between}>
        <View style={{ flex: 1 }}>
          <Text style={kit.rider}>{a.booking.clientName}</Text>
          {primary && a.booking.passengers ? (
            <Text style={kit.dim}>{a.booking.passengers} passenger{a.booking.passengers > 1 ? "s" : ""}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={kit.dim}>Your earnings</Text>
          <Text style={kit.earningsValue}>{money(safe.earning)}</Text>
        </View>
      </View>
      {primary && a.booking.pickupInstructions && (safe.phase === "accepted" || safe.phase === "arrived") ? (
        <Text style={kit.dim}>Pickup note: {a.booking.pickupInstructions}</Text>
      ) : null}

      {safe.error && <Banner tone="red" onPress={safe.clearError}>{safe.error}</Banner>}

      {safe.phase === "accepted" && needsSetOff(a) && (
        <>
          <Banner tone="gold" icon="clock">
            Reserved for {whenLabel(a.booking.scheduledAt!)}. Tap below when you set off — the customer is told you&apos;re on the way.
          </Banner>
          <View style={parts.actions}>
            <GradientButton title={safe.busy ? "…" : "Heading to pickup"} onPress={safe.headToPickup} disabled={safe.busy} />
          </View>
        </>
      )}

      {safe.phase === "accepted" && !needsSetOff(a) && (
        <View style={parts.actions}>
          {primary && phone ? <SquareButton icon="phone" label="Call customer" onPress={() => callNumber(phone)} /> : null}
          <SquareButton icon="navigation" label="Navigate" onPress={() => openNavigation(navTarget)} />
          <GradientButton title={safe.busy ? "…" : primary ? "I've Arrived at Pickup" : "I've Arrived at Rendezvous"}
            onPress={safe.arrive} disabled={safe.busy} />
        </View>
      )}

      {safe.phase === "arrived" && (
        <>
          {primary && safe.waiting && <WaitingBanner waiting={safe.waiting} freeLabel="Free waiting time" />}
          {waitingOnPrimary && (
            <Banner right={<ActivityIndicator size="small" color={dark.soft} />}>
              Waiting for the Primary chauffeur to complete the ride…
            </Banner>
          )}
          <View style={parts.actions}>
            {primary && phone ? <SquareButton icon="phone" label="Call customer" onPress={() => callNumber(phone)} /> : null}
            <GradientButton title={safe.busy ? "…" : primary ? "Start Ride" : "Pick Up Primary Chauffeur"}
              onPress={safe.start} disabled={safe.busy || waitingOnPrimary} />
          </View>
        </>
      )}

      {safe.phase === "started" && (
        <View style={parts.actions}>
          <SquareButton icon="navigation" label="Navigate" onPress={() => openNavigation(navTarget)} />
          <GradientButton title={safe.busy ? "Saving…" : primary ? "Customer Dropped Off" : "Complete — Returned Primary to Vehicle"}
            onPress={safe.complete} disabled={safe.busy} />
        </View>
      )}

      {/* PRIMARY after delivering the customer: the job stays open until the
          return leg brings them back to their own vehicle */}
      {safe.phase === "awaiting_return" && (
        <>
          <View style={styles.delivered}>
            <Text style={styles.deliveredTitle}>Customer dropped off ✓</Text>
            <Text style={styles.deliveredBody}>
              {uberReturn
                ? a.booking.uberReturnBookedAt
                  ? `Your Uber back to your vehicle is booked${a.booking.uberReturnRef ? ` — reference ${a.booking.uberReturnRef}` : ""}. Watch for the Uber text message with your driver's details.`
                  : "Your return is being arranged. We'll notify you when your pickup details are ready."
                : safe.coDriver
                  ? `${safe.coDriver.driver.firstName} ${safe.coDriver.driver.lastName} is on the way to pick you up and take you back to your vehicle.`
                  : "Your support chauffeur has been notified and will collect you shortly."}
            </Text>
            <Text style={kit.dim}>
              {uberReturn ? "Your earnings for this Safe Ride have been credited." : "This Safe Ride stays open until you're back at your car."}
            </Text>
          </View>
          {uberReturn ? (
            <View style={parts.actions}>
              <GradientButton title={safe.busy ? "Saving…" : "I'm back at my vehicle"} onPress={safe.backAtVehicle} disabled={safe.busy} />
            </View>
          ) : safe.coDriver?.driver.phone ? (
            <View style={parts.actions}>
              <OutlineButton title="Call Support Chauffeur" onPress={() => callNumber(safe.coDriver!.driver.phone!)} />
            </View>
          ) : null}
        </>
      )}

      <RatingModal visible={safe.phase === "completed"} title="Care Assignment Complete"
        prompt="Rate your experience for this Care assignment."
        hints={["Required: what went wrong?", "Notes about this assignment (optional)…"]}
        onDone={safe.rate} />
    </View>
  );
}

const styles = StyleSheet.create({
  chipGold: { fontFamily: fonts.bodySemi, fontSize: 9, color: colors.taupe, backgroundColor: "rgba(198,191,178,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  countdown: { marginLeft: "auto", fontFamily: fonts.heading, fontSize: 13, color: colors.taupe },
  when: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.taupe },
  routeLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: dark.dim },
  earnings: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  earningsLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.6)" },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  bar: { height: 4, backgroundColor: colors.taupe },
  coRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 36, height: 36 },
  coStatus: { fontFamily: fonts.bodySemi, fontSize: 10, marginTop: 1 },
  delivered: { gap: 4, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: dark.offerBorder, backgroundColor: "rgba(198,191,178,0.08)" },
  deliveredTitle: { fontFamily: fonts.heading, fontSize: 13, color: dark.text },
  deliveredBody: { fontFamily: fonts.body, fontSize: 12, color: dark.soft, lineHeight: 17 },
});

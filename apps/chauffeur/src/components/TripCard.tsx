/**
 * Active standard ride on Home: head to pickup → I've Arrived (waiting clock)
 * → Start Ride → End Ride → rate the rider. Mirrors the web chauffeur home.
 */
import { useState } from "react";
import { Text, View } from "react-native";
import type { DriverBooking } from "@movo/shared";
import { Icon } from "@movo/ui";
import { useTrip } from "@/lib/useTrip";
import { router } from "expo-router";
import { Route, dark, kit, money } from "./homeKit";
import {
  Banner, GradientButton, HandBackModal, RatingModal, RedOutlineButton, SquareButton, WaitingBanner,
  callNumber, openChat, openNavigation, parts,
} from "./tripParts";

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

      {trip.routeNotice && <Banner tone="gold" icon="alert" onPress={trip.clearRouteNotice}>{trip.routeNotice}</Banner>}
      {trip.error && <Banner tone="red" onPress={trip.clearError}>{trip.error}</Banner>}

      {trip.step === "arrived" && (
        <>
          <Banner tone="green" icon="check">You&apos;re at the pickup location</Banner>
          {trip.waiting && <WaitingBanner waiting={trip.waiting} freeLabel="Complimentary waiting" />}
        </>
      )}

      <View style={parts.actions}>
        {phone && trip.step !== "started" ? (
          <SquareButton icon="phone" label="Call rider" onPress={() => callNumber(phone)} />
        ) : null}
        <SquareButton icon="message" label="Chat with rider" onPress={() => openChat(booking.id, booking.bookingNumber)} />
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

      {beforeStart && <RedOutlineButton title="Can't make this ride — Cancel" onPress={() => setShowCancel(true)} />}
      {trip.step === "started" && (
        <RedOutlineButton title="Report Incident" onPress={() => router.push({
          pathname: "/report-incident",
          params: { bookingId: booking.id, ...(booking.bookingNumber ? { number: booking.bookingNumber } : {}) },
        })} />
      )}

      <HandBackModal visible={showCancel} title="Cancel this ride?" keepLabel="Keep Ride"
        body="We'll automatically find another available chauffeur nearby — the rider will be told we're arranging this, not that their ride was cancelled."
        placeholder="Reason (optional) — e.g. vehicle issue, running too late"
        busy={trip.busy} error={showCancel ? trip.error : null}
        onKeep={() => { setShowCancel(false); trip.clearError(); }}
        onConfirm={async (reason) => {
          if (await trip.cancel(reason)) {
            setShowCancel(false);
            onFinished(true);
          }
        }} />

      <RatingModal visible={trip.step === "completed"} title="Trip Complete" prompt="Trip completed — rate your rider."
        hints={["Required: what went wrong with this rider?", "Notes about this rider (optional)…"]}
        onDone={async (rating, feedback) => {
          await trip.rate(rating, feedback);
          onFinished(false);
        }} />
    </View>
  );
}

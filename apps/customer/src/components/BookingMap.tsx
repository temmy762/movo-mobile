/**
 * The booking screens' map: where you are before anything is picked, the
 * pickup pin once it is, and the road route to the destination once both are
 * set. Addresses are placed through movo-web (/api/places/geocode) and the
 * line follows the roads (/api/places/route).
 *
 * `nearby`: live nearby cars around the pickup (or you), refreshed every
 * 10 s, gliding and facing their direction, with "nearest car N min away".
 * `driver`: a live driver to follow instead (Movo Courier tracking), with the
 * server's route line when given.
 */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { places, rides } from "@movo/api";
import { decodePolyline, type LivePoint } from "@movo/shared";
import { colors, fonts } from "@movo/ui";
import { useRoadRoute } from "@/lib/useRoadRoute";
import { LiveCarMarker } from "./LiveCarMarker";

const WINNIPEG = { latitude: 49.8951, longitude: -97.1384, latitudeDelta: 0.12, longitudeDelta: 0.12 };
const CLOSE = { latitudeDelta: 0.02, longitudeDelta: 0.02 };
const PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

function usePlace(address: string) {
  const a = address.trim();
  const q = useQuery({
    queryKey: ["geocode", a.toLowerCase()],
    queryFn: () => places.geocode(a),
    enabled: a.length >= 3,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
  const point: LatLng | null = a.length >= 3 && q.data ? { latitude: q.data.lat, longitude: q.data.lng } : null;
  return { point, notFound: a.length >= 3 && q.isError };
}

/* Live nearby cars around a spot, every 10 s */
function useNearby(center: LatLng | null, enabled: boolean, tier?: string | null) {
  const lat = center ? Math.round(center.latitude * 1000) / 1000 : null;
  const lng = center ? Math.round(center.longitude * 1000) / 1000 : null;
  const q = useQuery({
    queryKey: ["nearby-cars", lat, lng, tier ?? ""],
    queryFn: () => rides.nearbyCars(lat!, lng!, tier),
    enabled: enabled && lat != null && lng != null,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  return q.data ?? { cars: [], nearestMinutes: null };
}

export function BookingMap({ pickup, dropoff, driver, driverLabel, driverRoute, nearby, tier }: {
  pickup: string; dropoff: string;
  driver?: LivePoint | null; driverLabel?: string;
  /** The server's encoded route line from the driver (trip.eta) */
  driverRoute?: string | null;
  nearby?: boolean; tier?: string | null;
}) {
  const map = useRef<MapView>(null);
  const [here, setHere] = useState<LatLng | null>(null);
  const from = usePlace(pickup);
  const to = usePlace(dropoff);
  const route = useRoadRoute(driverRoute ? null : from.point, driverRoute ? null : to.point);
  const serverLine = driverRoute ? decodePolyline(driverRoute).map((p) => ({ latitude: p.lat, longitude: p.lng })) : null;
  const near = useNearby(from.point ?? here, !!nearby && !driver, tier);

  /* Start on the rider, without asking — only if location is already allowed */
  useEffect(() => {
    let live = true;
    Location.getForegroundPermissionsAsync()
      .then((p) => (p.granted ? Location.getLastKnownPositionAsync() : null))
      .then((pos) => { if (live && pos) setHere({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const routeKey = route?.coordinates.length ?? 0;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const pts = route?.coordinates.length ? route.coordinates : [from.point, to.point].filter((p): p is LatLng => !!p);
    if (pts.length > 1) m.fitToCoordinates(pts, { edgePadding: PADDING, animated: true });
    else if (pts.length === 1) m.animateToRegion({ ...pts[0], ...CLOSE }, 400);
    else if (here) m.animateToRegion({ ...here, ...CLOSE }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.point?.latitude, from.point?.longitude, to.point?.latitude, to.point?.longitude, routeKey, here]);

  const problem = from.notFound ? "We couldn't find the pickup on the map. Check the address."
    : to.notFound ? "We couldn't find the destination on the map. Check the address." : null;
  const chip = nearby && !driver
    ? near.cars.length === 0 ? "No cars nearby right now"
      : near.nearestMinutes != null ? `Nearest car ${near.nearestMinutes} min away`
        : `${near.cars.length} car${near.cars.length > 1 ? "s" : ""} nearby`
    : null;

  return (
    <View style={styles.wrap}>
      <MapView ref={map} style={styles.map} initialRegion={WINNIPEG} showsUserLocation={!!here} toolbarEnabled={false} userInterfaceStyle="light"
        rotateEnabled={false} pitchEnabled={false}
        accessibilityLabel={from.point && to.point ? "Map of your route" : "Map"}>
        {serverLine ? (
          <Polyline coordinates={serverLine} strokeColor={colors.navy} strokeWidth={4} />
        ) : route ? (
          <Polyline coordinates={route.coordinates} strokeColor={colors.navy} strokeWidth={4}
            lineDashPattern={route.exact ? undefined : [8, 6]} />
        ) : null}
        {from.point && <Marker coordinate={from.point} title="Pickup" pinColor={colors.navy} />}
        {to.point && <Marker coordinate={to.point} title="Destination" pinColor="#ef4444" />}
        {driver && <LiveCarMarker point={driver} title={driverLabel ?? "Your driver"} />}
        {chip && near.cars.map((c) => (
          <LiveCarMarker key={c.id} point={{ lat: c.lat, lng: c.lng, heading: c.heading, speed: c.heading != null ? 5 : null }} size={32} durationMs={3000} />
        ))}
      </MapView>
      {chip && <View style={styles.chip} pointerEvents="none"><Text style={styles.chipText}>{chip}</Text></View>}
      {problem && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: "hidden", backgroundColor: "#e5e7eb" },
  map: { height: 220 },
  chip: { position: "absolute", left: 10, top: 10, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy },
  problem: { fontFamily: fonts.body, fontSize: 12, color: "#b91c1c", backgroundColor: "#fef2f2", paddingHorizontal: 12, paddingVertical: 8 },
});

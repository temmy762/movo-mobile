/**
 * The booking screens' map: where you are before anything is picked, the
 * pickup pin once it is, and the road route to the destination once both are
 * set. Addresses are placed through movo-web (/api/places/geocode) and the
 * line follows the roads (/api/places/route). A preview — panning is off so it
 * never fights the form's scrolling.
 */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { places } from "@movo/api";
import { colors, fonts } from "@movo/ui";
import { useRoadRoute } from "@/lib/useRoadRoute";

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

export function BookingMap({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  const map = useRef<MapView>(null);
  const [here, setHere] = useState<LatLng | null>(null);
  const from = usePlace(pickup);
  const to = usePlace(dropoff);
  const route = useRoadRoute(from.point, to.point);

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

  return (
    <View style={styles.wrap}>
      <MapView ref={map} style={styles.map} initialRegion={WINNIPEG} showsUserLocation={!!here} toolbarEnabled={false}
        scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
        accessibilityLabel={from.point && to.point ? "Map of your route" : "Map"}>
        {route && (
          <Polyline coordinates={route.coordinates} strokeColor={colors.navy} strokeWidth={4}
            lineDashPattern={route.exact ? undefined : [8, 6]} />
        )}
        {from.point && <Marker coordinate={from.point} title="Pickup" pinColor={colors.navy} />}
        {to.point && <Marker coordinate={to.point} title="Destination" pinColor="#ef4444" />}
      </MapView>
      {problem && <Text style={styles.problem}>{problem}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: "hidden", backgroundColor: "#e5e7eb" },
  map: { height: 190 },
  problem: { fontFamily: fonts.body, fontSize: 12, color: "#b91c1c", backgroundColor: "#fef2f2", paddingHorizontal: 12, paddingVertical: 8 },
});

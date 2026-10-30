/**
 * Map on Home (the web home's map): the chauffeur's own position, and during
 * a ride the pickup / drop-off pins, framed together, plus the rider's live
 * position while heading to pickup (it moves; the map doesn't re-frame). Google Maps on Android
 * (key from app.config.js), Apple Maps on iOS.
 */
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type LatLng } from "react-native-maps";
import { colors } from "@movo/ui";
import { dark } from "./homeKit";

export type MapPin = { coordinate: LatLng; kind: "pickup" | "dropoff" | "rider"; title: string };

const WINNIPEG = { latitude: 49.8951, longitude: -97.1384, latitudeDelta: 0.12, longitudeDelta: 0.12 };

/* Muted dark style to match the dark Home (Android / Google Maps) */
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d2030" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8fa3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#14141c" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c3045" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3f58" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1220" }] },
];

export function HomeMap({ pins, height = 220 }: { pins: MapPin[]; height?: number }) {
  const map = useRef<MapView>(null);
  const centred = useRef(false);
  const me = useRef<LatLng | null>(null);
  /* Re-frame for the ride's fixed pins only — the rider's position moves */
  const key = pins.filter((p) => p.kind !== "rider").map((p) => `${p.coordinate.latitude},${p.coordinate.longitude}`).join("|");

  const frame = () => {
    const points = [...pins.map((p) => p.coordinate), ...(me.current ? [me.current] : [])];
    if (points.length > 1) {
      map.current?.fitToCoordinates(points, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true });
    } else if (points.length === 1) {
      map.current?.animateToRegion({ ...points[0], latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
    }
  };

  /* Re-frame when the ride (its pins) changes */
  useEffect(() => { frame(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={WINNIPEG}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        userInterfaceStyle="dark"
        customMapStyle={DARK_STYLE}
        onUserLocationChange={(e) => {
          const c = e.nativeEvent.coordinate;
          if (!c) return;
          me.current = { latitude: c.latitude, longitude: c.longitude };
          /* Centre on the chauffeur the first time a fix arrives */
          if (!centred.current) {
            centred.current = true;
            frame();
          }
        }}
      >
        {pins.map((p) => p.kind === "rider" ? (
          <Marker key="rider" coordinate={p.coordinate} title={p.title} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.rider}><View style={styles.riderDot} /></View>
          </Marker>
        ) : (
          <Marker key={`${p.kind}-${p.coordinate.latitude}`} coordinate={p.coordinate} title={p.title}
            pinColor={p.kind === "pickup" ? colors.navy : "#ef4444"} />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  rider: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.25)", alignItems: "center", justifyContent: "center" },
  riderDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#fff" },
  wrap: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: dark.cardBorder, backgroundColor: dark.card },
});

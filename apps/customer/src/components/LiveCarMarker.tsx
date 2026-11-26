/**
 * A driver's car on the map: glides between live updates and faces its
 * direction of travel (the marker's native rotation, so turning is smooth).
 * Same top-down car as the website's live map.
 */
import { useEffect, useState } from "react";
import { Marker } from "react-native-maps";
import Svg, { Polygon, Rect } from "react-native-svg";
import type { LivePoint } from "@movo/shared";
import { useAnimatedPose } from "@/lib/useAnimatedPose";

function Car({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Rect x="14" y="8" width="16" height="28" rx="6" fill="#131936" stroke="#C6BFB2" strokeWidth="1.5" />
      <Rect x="16.5" y="13" width="11" height="7" rx="2" fill="#3b4a7a" />
      <Rect x="16.5" y="26" width="11" height="5" rx="2" fill="#3b4a7a" />
      <Polygon points="22,3 26,10 18,10" fill="#C6BFB2" />
    </Svg>
  );
}

export function LiveCarMarker({ point, title, size = 40, durationMs = 2000 }: {
  point: LivePoint; title?: string; size?: number; durationMs?: number;
}) {
  const pose = useAnimatedPose(point, durationMs);
  /* Android draws a custom marker once; let it settle, then stop re-capturing */
  const [tracks, setTracks] = useState(true);
  useEffect(() => { const t = setTimeout(() => setTracks(false), 800); return () => clearTimeout(t); }, []);
  if (!pose) return null;
  return (
    <Marker
      coordinate={{ latitude: pose.lat, longitude: pose.lng }}
      rotation={pose.heading}
      flat
      anchor={{ x: 0.5, y: 0.5 }}
      title={title}
      tracksViewChanges={tracks}
      zIndex={10}
    >
      <Car size={size} />
    </Marker>
  );
}

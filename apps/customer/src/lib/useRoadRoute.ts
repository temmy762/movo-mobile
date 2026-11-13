/**
 * The road route between two points for a map's route line (movo-web
 * /api/places/route). Asks again only when the start moves ~300 m or the
 * destination changes, so a moving chauffeur doesn't re-request every fix.
 * If Google can't route it, falls back to a straight line between the points.
 */
import { useQuery } from "@tanstack/react-query";
import type { LatLng } from "react-native-maps";
import { places } from "@movo/api";

const coarse = (n: number) => Math.round(n / 0.003) * 0.003;

export function useRoadRoute(from: LatLng | null, to: LatLng | null): { coordinates: LatLng[]; exact: boolean } | null {
  const key = from && to ? [coarse(from.latitude), coarse(from.longitude), to.latitude, to.longitude] : null;
  const q = useQuery({
    queryKey: ["road-route", key],
    queryFn: () => places.route({ lat: from!.latitude, lng: from!.longitude }, { lat: to!.latitude, lng: to!.longitude }),
    enabled: !!key,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
    placeholderData: (prev) => prev,
  });
  if (!from || !to) return null;
  if (q.data?.points.length) {
    return { coordinates: q.data.points.map(([latitude, longitude]) => ({ latitude, longitude })), exact: true };
  }
  return q.isError ? { coordinates: [from, to], exact: false } : null;
}

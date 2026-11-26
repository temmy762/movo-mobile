/**
 * Glide a car (position AND heading) between live updates — the app's
 * counterpart of movo-web app/home/components/useAnimatedPose. Updates arrive
 * every few seconds; moving smoothly between them reads as live movement.
 */
import { useEffect, useRef, useState } from "react";
import { headingFor, lerpPoint, shortestTurn, type LivePoint } from "@movo/shared";

export type Pose = { lat: number; lng: number; heading: number };

export function useAnimatedPose(target: LivePoint | null, durationMs = 2000): Pose | null {
  const [pose, setPose] = useState<Pose | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const prevPointRef = useRef<LivePoint | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const begin = (fn: () => void) => { rafRef.current = requestAnimationFrame(fn); };
    const stop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    if (!target) {
      poseRef.current = null; prevPointRef.current = null;
      begin(() => setPose(null));
      return stop;
    }
    const from = poseRef.current;
    const heading = headingFor(prevPointRef.current, target, from?.heading ?? target.heading ?? 0);
    prevPointRef.current = target;
    if (!from) {
      const first = { lat: target.lat, lng: target.lng, heading };
      poseRef.current = first;
      begin(() => setPose(first));
      return stop;
    }
    const turn = shortestTurn(from.heading, heading);
    const start = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const p = lerpPoint(from, target, t);
      const next = { ...p, heading: (from.heading + turn * Math.min(1, t * 2) + 360) % 360 };
      poseRef.current = next;
      setPose(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    begin(step);
    return stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, target?.ts, target?.heading, durationMs]);

  return pose;
}

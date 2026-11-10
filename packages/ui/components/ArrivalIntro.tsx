/**
 * "The Arrival" — launch intro for both apps (approved preview, Nov 2026).
 * A gold route draws across a night map, a headlight glow travels along it,
 * and the Movo mark turns into view with the app's tagline. ~2.5 s, plays
 * once per cold start while the app restores the session; tap to skip.
 * It stays on its last frame until `ready` (session restored), so the app
 * never flashes blank in between.
 * Reduce Motion: the final frame fades in and out instead.
 */
import { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { MARK, WORDMARK } from "./brandPaths";
import { colors, fonts } from "../tokens";

const VB_W = 320, VB_H = 692;
const IVORY = "#F5F5F2";
const GOLD = colors.taupe;

/* Route in viewBox units: cubic segments (the S commands of the preview, expanded) */
type P = [number, number];
const SEGMENTS: [P, P, P, P][] = [
  [[-10, 600], [60, 600], [70, 520], [120, 500]],
  [[120, 500], [170, 480], [210, 470], [205, 410]],
  [[205, 410], [200, 350], [150, 340], [160, 300]],
];
const ROUTE_D = `M ${SEGMENTS[0][0].join(" ")} ` + SEGMENTS.map(([, a, b, c]) => `C ${a.join(" ")}, ${b.join(" ")}, ${c.join(" ")}`).join(" ");

/* Points along the route with cumulative length, for the glow and the dash */
function sampleRoute(steps = 40) {
  const pts: { x: number; y: number; s: number }[] = [];
  let s = 0;
  let prev: P | null = null;
  for (const [p0, p1, p2, p3] of SEGMENTS) {
    for (let i: number = prev ? 1 : 0; i <= steps; i++) {
      const t: number = i / steps, u: number = 1 - t;
      const x: number = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y: number = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      if (prev) s += Math.hypot(x - prev[0], y - prev[1]);
      pts.push({ x, y, s });
      prev = [x, y];
    }
  }
  return { pts, length: s };
}

/* Faint street grid + a few lit windows (seeded, so it's the same every launch) */
function nightMap() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < 22; i++) {
    const y = rnd() * VB_H, tilt = (rnd() - 0.5) * 60;
    lines.push({ x1: -20, y1: y, x2: VB_W + 20, y2: y + tilt });
    const x = rnd() * VB_W, lean = (rnd() - 0.5) * 50;
    lines.push({ x1: x, y1: -20, x2: x + lean, y2: VB_H + 20 });
  }
  const dots = Array.from({ length: 34 }, () => ({ x: rnd() * VB_W, y: rnd() * VB_H, o: rnd() * 0.45 }));
  return { lines, dots };
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ArrivalIntro({ tagline, ready, onDone }: { tagline: string; ready: boolean; onDone: () => void }) {
  const { pts, length } = useMemo(() => sampleRoute(), []);
  const map = useMemo(nightMap, []);
  const progress = useRef(new Animated.Value(0)).current;  // route + glow (JS driver: SVG props)
  const flip = useRef(new Animated.Value(0)).current;      // mark rotateY
  const text = useRef(new Animated.Value(0)).current;      // wordmark + tagline
  const fade = useRef(new Animated.Value(1)).current;      // whole intro
  const done = useRef(false);
  const timeUp = useRef(false);
  const readyRef = useRef(ready);
  useEffect(() => { readyRef.current = ready; }, [ready]);

  const finish = () => {
    timeUp.current = true;
    if (done.current || !readyRef.current) return;
    done.current = true;
    Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        progress.setValue(1); flip.setValue(1); text.setValue(1);
        timer = setTimeout(finish, 900);
        return;
      }
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(flip, { toValue: 1, duration: 850, delay: 800, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 450, delay: 1150, useNativeDriver: true }),
      ]).start();
      timer = setTimeout(finish, 2150);
    });
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Animation finished before the session was ready: leave as soon as it is */
  useEffect(() => { if (ready && timeUp.current) finish(); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputRange = pts.map((p) => p.s / length);
  const cx = progress.interpolate({ inputRange, outputRange: pts.map((p) => p.x) });
  const cy = progress.interpolate({ inputRange, outputRange: pts.map((p) => p.y) });
  const glowOpacity = progress.interpolate({ inputRange: [0, 0.1, 0.86, 1], outputRange: [0, 1, 1, 0] });
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });
  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ["-90deg", "0deg"] });
  const markOpacity = flip.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1] });
  const rise = text.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel="Skip intro">
        <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id="sky" cx="50%" cy="110%" r="90%">
              <Stop offset="0" stopColor="#1b2147" />
              <Stop offset="0.45" stopColor={colors.navy} />
              <Stop offset="1" stopColor="#0A0A0F" />
            </RadialGradient>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF7E2" stopOpacity="0.95" />
              <Stop offset="0.12" stopColor="#FFF0D2" stopOpacity="0.5" />
              <Stop offset="0.45" stopColor={GOLD} stopOpacity="0.14" />
              <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#sky)" />
          {map.lines.map((l, i) => <Line key={i} {...l} stroke={GOLD} strokeOpacity={0.07} strokeWidth={1} />)}
          {map.dots.map((d, i) => <Rect key={`d${i}`} x={d.x} y={d.y} width={1.4} height={1.4} fill="#F5F0E2" fillOpacity={d.o} />)}
          <Path d={ROUTE_D} stroke={GOLD} strokeOpacity={0.18} strokeWidth={7} fill="none" strokeLinecap="round" />
          <AnimatedPath d={ROUTE_D} stroke={GOLD} strokeWidth={2} fill="none" strokeLinecap="round"
            strokeDasharray={[length, length]} strokeDashoffset={dashOffset} />
          <AnimatedCircle cx={cx} cy={cy} r={34} fill="url(#glow)" opacity={glowOpacity} />
        </Svg>

        <View style={styles.markWrap} pointerEvents="none">
          <Animated.View style={{ opacity: markOpacity, transform: [{ perspective: 600 }, { rotateY }] }}>
            <Svg width={86} height={86 * 93.79 / 98.08} viewBox={MARK.viewBox}>
              {MARK.paths.map((d, i) => <Path key={i} d={d} fill={IVORY} />)}
            </Svg>
          </Animated.View>
          <Animated.View style={{ opacity: text, transform: [{ translateY: rise }], alignItems: "center", gap: 16 }}>
            <Svg width={168} height={168 * 93.4 / 387.5} viewBox={WORDMARK.viewBox}>
              {WORDMARK.paths.map((d, i) => <Path key={i} d={d} fill={IVORY} />)}
            </Svg>
            <Animated.Text style={styles.tagline}>{tagline.toUpperCase()}</Animated.Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.navy, zIndex: 100, elevation: 100 },
  markWrap: { position: "absolute", left: 0, right: 0, top: "28%", alignItems: "center", gap: 18 },
  tagline: { fontFamily: fonts.body, fontSize: 13, letterSpacing: 2, color: GOLD },
});

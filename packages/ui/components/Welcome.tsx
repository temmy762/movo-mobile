/**
 * First-launch welcome (approved preview, Nov 2026): swipeable cards whose
 * artwork lags behind the text (parallax), page dots, and two actions.
 * Each card is exactly the screen width with 28px side padding inside it, so
 * text never runs to the edge.
 */
import { useRef, useState } from "react";
import { Animated, type FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, fonts } from "../tokens";

export type WelcomeArt = "car" | "key" | "shield" | "wheel";
export type WelcomeCard = { art: WelcomeArt; kicker: string; title: string; body: string };

const GOLD = colors.taupe;
const NIGHT = "#0A0A0F";
const SIDE = 28;

/* Gold line illustrations (same drawings as the preview) */
function Art({ kind }: { kind: WelcomeArt }) {
  const line = { stroke: GOLD, strokeWidth: 1.6, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const soft = { ...line, stroke: "rgba(198,191,178,0.35)" };
  return (
    <Svg width={220} height={160} viewBox="0 0 220 160">
      <Path d="M10 128 H210" {...soft} />
      {kind === "car" && (<>
        <Path d="M38 112 c0-10 6-18 16-21 l22-7 c6-14 18-24 34-24 h22 c14 0 26 8 32 20 l14 2 c12 2 20 12 20 24 v6 H38 z" {...line} />
        <Circle cx={72} cy={114} r={13} {...line} /><Circle cx={158} cy={114} r={13} {...line} />
        <Path d="M88 84 h66 M110 60 v24" {...line} /><Circle cx={196} cy={98} r={3} fill={GOLD} />
        <Path d="M150 30 c0-11 9-20 20-20 s20 9 20 20 c0 15-20 34-20 34 s-20-19-20-34 z" {...soft} /><Circle cx={170} cy={30} r={6} {...line} />
      </>)}
      {kind === "key" && (<>
        <Path d="M28 116 c0-9 5-16 14-19 l18-6 c5-11 15-19 28-19 h18 c11 0 21 6 26 16 l11 2 c10 2 17 10 17 20 v5 H28 z" {...line} />
        <Circle cx={56} cy={117} r={10} {...line} /><Circle cx={126} cy={117} r={10} {...line} />
        <Circle cx={176} cy={46} r={16} {...line} /><Circle cx={176} cy={46} r={4} fill={GOLD} />
        <Path d="M164 58 l-30 30 m10-10 l8 8 m-2-14 l8 8" {...line} />
        <Path d="M150 128 c10-30 30-30 40 0" {...soft} /><Circle cx={170} cy={96} r={7} {...soft} />
      </>)}
      {kind === "shield" && (<>
        <Path d="M110 18 l52 18 v34 c0 32-22 52-52 62 c-30-10-52-30-52-62 V36 z" {...line} />
        <Path d="M88 74 l16 16 l30-32" {...line} />
        <Path d="M30 100 c20-30 40 10 60-10 M130 100 c20-30 40 10 60-10" {...soft} />
        <Circle cx={30} cy={100} r={3} fill={GOLD} /><Circle cx={190} cy={90} r={3} fill={GOLD} />
      </>)}
      {kind === "wheel" && (<>
        <Circle cx={110} cy={76} r={48} {...line} /><Circle cx={110} cy={76} r={12} {...line} />
        <Path d="M110 88 v36 M98 72 l-44-8 M122 72 l44-8" {...line} />
        <Path d="M40 30 h30 M150 30 h30" {...soft} /><Circle cx={110} cy={76} r={3} fill={GOLD} />
      </>)}
    </Svg>
  );
}

export function Welcome({ cards, primary, secondary, onPrimary, onSecondary }: {
  cards: WelcomeCard[];
  primary: string; secondary: string;
  onPrimary: () => void; onSecondary: () => void;
}) {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<WelcomeCard> | null>(null);
  const [index, setIndex] = useState(0);
  const last = cards.length - 1;

  const goTo = (i: number) => {
    listRef.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.skipRow}>
        {index < last ? (
          <Pressable onPress={() => goTo(last)} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : <View style={{ height: 20 }} />}
      </SafeAreaView>

      <Animated.FlatList
        ref={listRef}
        data={cards}
        keyExtractor={(c) => c.title}
        horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => {
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          const artX = scrollX.interpolate({ inputRange: range, outputRange: [-0.35 * width, 0, 0.35 * width], extrapolate: "clamp" });
          const copyOpacity = scrollX.interpolate({ inputRange: range, outputRange: [0.15, 1, 0.15], extrapolate: "clamp" });
          return (
            <View style={[styles.card, { width }]} accessibilityLabel={`${i + 1} of ${cards.length}`}>
              <View style={styles.art}>
                <View style={styles.halo} />
                <Animated.View style={{ transform: [{ translateX: artX }] }}><Art kind={item.art} /></Animated.View>
              </View>
              <Animated.View style={[styles.copy, { opacity: copyOpacity }]}>
                <Text style={styles.kicker}>{item.kicker.toUpperCase()}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      <SafeAreaView edges={["bottom"]} style={styles.foot}>
        {cards.length > 1 && (
          <View style={styles.dots}>
            {cards.map((c, i) => <View key={c.title} style={[styles.dot, i === index && styles.dotOn]} />)}
          </View>
        )}
        <Pressable onPress={() => (index < last ? goTo(index + 1) : onPrimary())} accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaText}>{index < last ? "Next" : primary}</Text>
        </Pressable>
        <Pressable onPress={onSecondary} accessibilityRole="button" style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}>
          <Text style={styles.ghostText}>{secondary}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: NIGHT, zIndex: 90, elevation: 90 },
  skipRow: { alignItems: "flex-end", paddingHorizontal: SIDE, paddingTop: 8 },
  skip: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#8E8A99" },
  card: { paddingHorizontal: SIDE, paddingTop: 24 },
  art: { height: 300, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(19,25,54,0.9)" },
  copy: { gap: 10, marginTop: 8 },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.8, color: GOLD },
  title: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 31, color: "#F5F5F2" },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: "#B9B6C2" },
  foot: { paddingHorizontal: SIDE - 6, paddingTop: 12, paddingBottom: 12, gap: 12 },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(245,245,242,0.25)" },
  dotOn: { width: 20, backgroundColor: GOLD },
  cta: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy, borderWidth: 1, borderColor: "rgba(198,191,178,0.45)" },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#F5F5F2" },
  ghost: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,245,242,0.18)" },
  ghostText: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#F5F5F2" },
});

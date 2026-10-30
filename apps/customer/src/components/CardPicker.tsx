/**
 * How to pay at checkout — a saved card (the web's SavedCardPay) or a new one
 * in Stripe's PaymentSheet. `value`: a card id, null = new card, undefined =
 * not chosen yet (the first saved card is then picked).
 */
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { payments } from "@movo/api";
import type { SavedCard } from "@movo/shared";
import { colors, fonts } from "@movo/ui";

export const cardLabel = (c: SavedCard) =>
  `${c.brand.charAt(0).toUpperCase()}${c.brand.slice(1)} •••• ${c.last4}`;

export function useSavedCards() {
  return useQuery({ queryKey: ["saved-cards"], queryFn: async () => (await payments.cards()).paymentMethods });
}

function Option({ id, title, sub, value, onChange }: {
  id: string | null; title: string; sub?: string; value: string | null | undefined; onChange: (id: string | null) => void;
}) {
  const on = value === id;
  return (
    <Pressable onPress={() => onChange(id)} style={[styles.option, on && styles.optionOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export function CardPicker({ value, onChange }: { value: string | null | undefined; onChange: (cardId: string | null) => void }) {
  const cards = useSavedCards();
  const list = cards.data ?? [];

  /* The first saved card is the default, as on the web */
  const first = list[0]?.id;
  useEffect(() => {
    if (first && value === undefined) onChange(first);
  }, [first, value, onChange]);

  if (cards.isPending) return <ActivityIndicator color={colors.navy} />;
  if (!list.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Pay with</Text>
      {list.map((c) => (
        <Option key={c.id} id={c.id} title={cardLabel(c)} sub={`Expires ${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}`}
          value={value} onChange={onChange} />
      ))}
      <Option id={null} title="Use a new card" value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  optionOn: { borderColor: colors.navy },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.navy },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.navy },
  title: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#111827" },
  sub: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280" },
});

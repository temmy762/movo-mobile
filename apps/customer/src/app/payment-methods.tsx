/**
 * Payment methods — mirrors movo-web home/payment: the rider's saved cards,
 * add one (Stripe PaymentSheet in setup mode, no charge) or remove one.
 * Cards used at checkout are saved automatically for next time.
 */
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, payments } from "@movo/api";
import { Button, Card, Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { addCard } from "@/lib/pay";
import { cardLabel, useSavedCards } from "@/components/CardPicker";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function PaymentMethods() {
  const user = useSession((s) => s.user);
  const queryClient = useQueryClient();
  const cards = useSavedCards();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const list = cards.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-cards"] });

  const add = async () => {
    setAdding(true);
    setNotice(null);
    try {
      if (await addCard({ name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), email: user?.email })) {
        setNotice({ ok: true, text: "Card saved." });
        refresh();
      }
    } catch (e) {
      setNotice({ ok: false, text: e instanceof ApiError && e.status !== 0 ? e.message : e instanceof Error ? e.message : "Couldn't save the card." });
    } finally {
      setAdding(false);
    }
  };

  const remove = (id: string, label: string) =>
    Alert.alert("Remove card?", `${label} will be removed from your account.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          setRemoving(id);
          setNotice(null);
          try {
            await payments.removeCard(id);
            refresh();
          } catch (e) {
            setNotice({ ok: false, text: e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't remove the card. Please try again." });
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F2" }}>
      <ScreenHeader title="Payment methods" fallback="/profile" />
      <ScrollView contentContainerStyle={styles.page}>
        {notice && <Text style={[styles.notice, { color: notice.ok ? "#15803d" : "#dc2626" }]}>{notice.text}</Text>}

        {cards.isPending ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.navy} />
        ) : cards.isError ? (
          <Text style={styles.muted}>Couldn&apos;t load your cards. Please try again.</Text>
        ) : !list.length ? (
          <Card style={{ alignItems: "center", gap: 4, paddingVertical: 28 }}>
            <Text style={styles.strong}>No saved cards</Text>
            <Text style={[styles.muted, { textAlign: "center" }]}>Cards you pay with are saved automatically, or add one now.</Text>
          </Card>
        ) : (
          list.map((c) => (
            <Card key={c.id} style={styles.card}>
              <View style={styles.cardIcon}><Icon name="wallet" size={18} color={colors.navy} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.strong}>{cardLabel(c)}</Text>
                <Text style={styles.muted}>Expires {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}</Text>
              </View>
              <Pressable onPress={() => remove(c.id, cardLabel(c))} disabled={removing === c.id} hitSlop={8} accessibilityRole="button"
                accessibilityLabel={`Remove ${cardLabel(c)}`}>
                {removing === c.id ? <ActivityIndicator color="#dc2626" /> : <Text style={styles.remove}>Remove</Text>}
              </Pressable>
            </Card>
          ))
        )}

        <Button title="Add a card" onPress={add} loading={adding} />
        <Text style={[styles.muted, { textAlign: "center" }]}>Cards are stored securely by Stripe. Movo never sees your full card number.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  notice: { fontFamily: fonts.bodySemi, fontSize: 13, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eef0f8", alignItems: "center", justifyContent: "center" },
  strong: { fontFamily: fonts.bodySemi, fontSize: 14, color: "#111827" },
  muted: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  remove: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#dc2626" },
});

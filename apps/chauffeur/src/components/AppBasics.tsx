/**
 * Onboarding step 6 — Chauffeur App Basics. Mirrors movo-web
 * driver/onboarding/chauffeur/AppBasics: six expandable sections; opening one
 * marks it reviewed (saved to the account by the screen). Continue unlocks
 * once all six are reviewed — the server enforces the same rule.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, colors, fonts } from "@movo/ui";

export const APP_BASICS: { key: string; title: string; items: string[] }[] = [
  {
    key: "accepting", title: "Going Online & Accepting Rides",
    items: [
      "Set your status to Online to receive bookings.",
      "Incoming requests show pickup, destination, trip details, and your payout.",
      "You have 30 seconds to accept or decline a request.",
      "Unaccepted requests move to another available chauffeur.",
      "Keep your availability updated.",
    ],
  },
  {
    key: "navigation", title: "Navigation & Trip Management",
    items: [
      "Use the app to navigate to pickup and destination.",
      "Follow the confirmed route and approved stops.",
      "Review any customer changes to the trip.",
      "Update your trip status accurately.",
      "Mark trips completed only after drop off.",
    ],
  },
  {
    key: "communication", title: "Communication with Clients",
    items: [
      "Use Movo’s approved messaging and calling features.",
      "Keep communication polite and professional.",
      "Respond promptly when safe.",
      "Protect customer information.",
      "Contact Movo dispatch when assistance is needed.",
    ],
  },
  {
    key: "earnings", title: "Earnings & Payments",
    items: [
      "View your payout before accepting a booking.",
      "Payments are processed securely through Movo.",
      "Tips belong to the chauffeur.",
      "View completed trips and earnings in your dashboard.",
      "Payouts go to your connected bank account according to the payout schedule.",
    ],
  },
  {
    key: "reservations", title: "Reservations & Notifications",
    items: [
      "Review upcoming reservations in your dashboard.",
      "Accept only bookings you can complete.",
      "Keep notifications enabled.",
      "Start pickup when ready to travel to the customer.",
      "Notify dispatch immediately of delays or cancellations.",
    ],
  },
  {
    key: "safe-ride", title: "Safe Ride Bookings",
    items: [
      "Travel to pickup using your own vehicle.",
      "Verify the customer and vehicle before starting.",
      "Drive the customer’s vehicle to the confirmed destination.",
      "Follow Movo’s return transportation instructions.",
      "Report vehicle concerns or incidents immediately.",
    ],
  },
];

export const allAppBasicsReviewed = (reviewed: string[]) => APP_BASICS.every((s) => reviewed.includes(s.key));

export function AppBasics({ reviewed, onReviewed }: { reviewed: string[]; onReviewed: (key: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const done = APP_BASICS.filter((s) => reviewed.includes(s.key)).length;

  const toggle = (key: string) => {
    setOpen((cur) => (cur === key ? null : key));
    if (!reviewed.includes(key)) onReviewed(key);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={st.progress}>
        <Text style={st.progressHint}>OPEN EACH SECTION TO REVIEW IT</Text>
        <Text style={[st.progressCount, done === APP_BASICS.length && { color: "#16a34a" }]}>{done} of {APP_BASICS.length} reviewed</Text>
      </View>
      {APP_BASICS.map((s, i) => {
        const isOpen = open === s.key;
        const isDone = reviewed.includes(s.key);
        return (
          <View key={s.key} style={[st.card, isDone && { borderColor: "#bbf7d0" }]}>
            <Pressable onPress={() => toggle(s.key)} style={st.head} accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${s.title}${isDone ? ", reviewed" : ""}`}>
              <View style={[st.num, isDone && { backgroundColor: "#16a34a" }]}>
                {isDone ? <Icon name="check" size={13} color="#fff" strokeWidth={3} /> : <Text style={st.numText}>{i + 1}</Text>}
              </View>
              <Text style={st.title}>{s.title}</Text>
              <View style={{ transform: [{ rotate: isOpen ? "-90deg" : "90deg" }] }}>
                <Icon name="chevronRight" size={16} color="#9ca3af" />
              </View>
            </Pressable>
            {isOpen && (
              <View style={st.body}>
                {s.items.map((item) => (
                  <View key={item} style={st.row}>
                    <View style={st.dot} />
                    <Text style={st.item}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  progress: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressHint: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.6, color: "#6b7280" },
  progressCount: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy },
  card: { borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", backgroundColor: "#fff", overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#EFE9DF", alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.heading, fontSize: 13, color: colors.navy },
  title: { flex: 1, fontFamily: fonts.heading, fontSize: 14, color: colors.navy },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.taupe, marginTop: 6 },
  item: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 18 },
});

/**
 * Help & policies — mirrors movo-web driver/home/profile/help and gps-policy:
 * support contact, safety on a trip, and how location is used.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { emailSupport, openWeb } from "@/lib/links";

const GPS_POLICY: { heading: string; body: string }[] = [
  { heading: "When we track your location", body: "Only while you're online in the Movo Chauffeur app — including in the background, so you keep receiving nearby requests and riders can see you arriving. Tracking stops when you go offline." },
  { heading: "How it's used", body: "To match you with nearby ride requests, show your position to the rider during an accepted ride, and calculate routes, fares and arrival times." },
  { heading: "Who sees it", body: "A rider sees your location only after you accept their ride, and only for that ride. Movo's dispatch team can see online chauffeurs to manage rides and keep everyone safe." },
  { heading: "Your control", body: "Go offline at any time to stop sharing. You can also turn off location in your phone's settings, but you won't receive ride requests without it." },
];

export default function Help() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Help & policies" fallback="/profile" />
      <ScrollView contentContainerStyle={styles.page}>
        <Card style={{ gap: 8 }}>
          <Text style={styles.title}>Contact Movo support</Text>
          <Text style={styles.body}>Questions about rides, payouts, documents or your account — email us and we&apos;ll get back to you as soon as we can.</Text>
          <Button title="Email support" onPress={() => emailSupport()} />
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.title}>Safety on a trip</Text>
          <Text style={styles.body}>In a life-threatening emergency, call 911 first. Pull over somewhere safe before making a call while driving.</Text>
          <Text style={styles.body}>During a ride, tap SOS on the trip card to call 911 or alert Movo — we&apos;ll see your ride and location right away. Afterwards, use Profile › Report an incident to tell us what happened.</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={styles.title}>GPS & location policy</Text>
          {GPS_POLICY.map((p) => (
            <View key={p.heading} style={{ gap: 2 }}>
              <Text style={styles.heading}>{p.heading}</Text>
              <Text style={styles.body}>{p.body}</Text>
            </View>
          ))}
          <Text style={styles.link} onPress={() => openWeb("/privacy-policy")}>Read the full privacy policy</Text>
        </Card>

        <Card style={{ gap: 6 }}>
          <Text style={styles.title}>Agreements</Text>
          <Text style={styles.link} onPress={() => openWeb("/chauffeur-agreement")}>Chauffeur agreement</Text>
          <Text style={styles.link} onPress={() => openWeb("/terms")}>Terms of service</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  heading: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1F2937" },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#4B5563", lineHeight: 19 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.navy, textDecorationLine: "underline", paddingVertical: 4 },
});

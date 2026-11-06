/**
 * Onboarding step 4 — Movo Chauffeur Standards, from Movo's standards sheet.
 * Mirrors movo-web driver/onboarding/chauffeur/ChauffeurStandards; change both
 * together.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SvgXml } from "react-native-svg";
import { colors, fonts } from "@movo/ui";

/* 24×24 line icons — same drawings as the web page */
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  door: '<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="0.8"/>',
  luggage: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M9 11v5M15 11v5"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M3 3l18 18"/>',
  nosmoke: '<path d="M3 15h13v4H3zM19 15v4M3 3l18 18"/><path d="M17 9c0-2-2-2-2-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  xcircle: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
  chart: '<path d="M5 20v-6M10 20V10M15 20v-8M20 20V6"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  license: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 11h6M9 14h4"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  nophone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M3 3l18 18"/>',
  nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  car: '<path d="M5 17h14M3 13l2-6h14l2 6v5H3z"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M17 6l3 3M15 8l2 2"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 21c0-3-2-5.2-5-5.8"/>',
};
type IconName = keyof typeof ICONS;

const svg = (name: IconName) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${colors.navy}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.head}>
        <View style={s.num}><Text style={s.numText}>{n}</Text></View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function IconList({ items }: { items: [IconName, string][] }) {
  return (
    <View style={{ gap: 10 }}>
      {items.map(([icon, text]) => (
        <View key={text} style={s.row}>
          <SvgXml xml={svg(icon)} width={18} height={18} />
          <Text style={s.item}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function DotList({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {items.map((text) => (
        <View key={text} style={s.row}>
          <View style={s.dot} />
          <Text style={s.item}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const UNIFORMS = [
  { src: require("../../assets/standards/uniform-shirt.webp"), label: "Standard & Safe Ride" },
  { src: require("../../assets/standards/uniform-jacket.webp"), label: "Executive" },
  { src: require("../../assets/standards/uniform-suit.webp"), label: "Concierge" },
];

export function ChauffeurStandards() {
  return (
    <View style={{ gap: 12 }}>
      <Section n={1} title="Movo Uniform">
        <View style={s.uniforms}>
          {UNIFORMS.map((u) => (
            <View key={u.label} style={s.uniform}>
              <Image source={u.src} style={s.uniformImg} contentFit="cover" accessibilityLabel={u.label} />
              <Text style={s.caption}>{u.label}</Text>
            </View>
          ))}
        </View>
        <DotList items={[
          "Standard and Safe Ride: white shirt, dark pants and clean dark shoes",
          "Executive: the Standard uniform plus a dark blazer",
          "Concierge: full dark suit with a dark tie",
          "Keep a clean, well-groomed appearance, including hair, nails and hygiene",
          "Avoid strong fragrances",
          "Maintain a professional and presentable appearance",
        ]} />
      </Section>

      <Section n={2} title="Client Service Standards">
        <IconList items={[
          ["user", "Greet clients courteously, using their name when available"],
          ["door", "Concierge chauffeurs: open vehicle doors and assist with entry and exit"],
          ["luggage", "Assist with luggage when requested"],
          ["chat", "Maintain a quiet, professional environment unless the client initiates conversation"],
          ["shield", "Respect client privacy and never share personal or trip information"],
          ["card", "Never request personal payments outside the Movo platform"],
          ["nosmoke", "No smoking, vaping or inappropriate behaviour"],
        ]} />
      </Section>

      <Section n={3} title="Punctuality & Reliability">
        <IconList items={[
          ["clock", "Accepting a booking is a firm commitment"],
          ["calendar", "Arrive 5 to 10 minutes early for every booking, including reservations"],
          ["bell", "Notify Movo immediately if unavoidable delays occur"],
          ["xcircle", "Do not cancel or go offline after accepting a booking, except in emergencies"],
          ["chart", "Repeated cancellations, late arrivals or no-shows may trigger an account review"],
          ["pin", "Keep your availability updated in the Movo app"],
        ]} />
      </Section>

      <Section n={4} title="Safe Driving & Trip Management">
        <IconList items={[
          ["license", "Maintain a valid driver’s licence and all required authorizations"],
          ["alert", "Follow traffic laws and safe driving practices"],
          ["nophone", "Do not use a handheld phone while driving"],
          ["nav", "Set up navigation before departure and use only hands-free functions when needed"],
          ["route", "Follow the confirmed route and approved stops"],
          ["file", "Update trip status accurately: Arrived, Trip Started, Completed"],
          ["alert", "Report any safety incidents, collisions or concerns to Movo immediately"],
        ]} />
      </Section>

      <Section n={5} title="Vehicle Cleanliness & Readiness">
        <Text style={s.band}>For Movo or chauffeur-supplied vehicles</Text>
        <View style={s.withPhoto}>
          <Image source={require("../../assets/standards/vehicle-interior.webp")} style={s.photo} contentFit="cover"
            accessibilityLabel="Clean vehicle interior" />
          <DotList items={[
            "Keep the vehicle clean and presentable, interior and exterior",
            "Remove personal items and clutter",
            "Ensure vehicle features are working properly",
            "Do not allow food or strong odours in the vehicle",
          ]} />
        </View>
        <Text style={s.band}>For Safe Ride customer-owned vehicles</Text>
        <View style={s.withPhoto}>
          <Image source={require("../../assets/standards/safe-ride-keys.webp")} style={s.photo} contentFit="cover"
            accessibilityLabel="Customer handing over car keys" />
          <DotList items={[
            "Respect the customer’s vehicle and belongings",
            "Do not adjust vehicle settings unnecessarily",
            "Do not smoke, eat or transport unauthorized passengers",
            "Report any pre-existing damage or safety concerns before departure",
          ]} />
        </View>
      </Section>

      <Section n={6} title="Safe Ride Additional Requirements">
        <IconList items={[
          ["car", "Chauffeurs must have their own transportation to reach the customer’s pickup location"],
          ["key", "Verify the customer, vehicle, destination and authorization to drive"],
          ["key", "Handle customer keys responsibly and return them to the customer or an authorized person"],
          ["pin", "Follow Movo dispatch instructions for your return after drop-off"],
          ["file", "Report any issues, vehicle damage or incidents to Movo immediately"],
        ]} />
      </Section>

      <Section n={7} title="Accountability & Compliance">
        <IconList items={[
          ["file", "Maintain current licensing, screening and required documentation"],
          ["shield", "Cooperate with service quality and safety reviews"],
          ["chart", "Report serious incidents, complaints or policy violations"],
          ["people", "Repeated violations may result in review, temporary restriction or termination of platform access"],
        ]} />
      </Section>
    </View>
  );
}

const s = StyleSheet.create({
  section: { borderRadius: 16, borderWidth: 1, borderColor: "#f3f4f6", backgroundColor: "#fff", padding: 14, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#EFE9DF", alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.heading, fontSize: 14, color: colors.navy },
  sectionTitle: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.navy },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  item: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.taupe, marginTop: 6 },
  uniforms: { flexDirection: "row", gap: 8 },
  uniform: { flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#f3f4f6", backgroundColor: "#fafafa" },
  uniformImg: { width: "100%", aspectRatio: 172 / 220 },
  caption: { fontFamily: fonts.body, fontSize: 10, color: "#4b5563", textAlign: "center", paddingHorizontal: 4, paddingVertical: 6, lineHeight: 13 },
  band: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#1f2937", backgroundColor: "#F6F2EC", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden" },
  withPhoto: { flexDirection: "row", gap: 10 },
  photo: { width: "38%", aspectRatio: 182 / 130, borderRadius: 12 },
});

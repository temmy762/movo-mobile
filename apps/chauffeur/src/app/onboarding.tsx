/**
 * Chauffeur application — mirrors movo-web driver/onboarding/chauffeur (the
 * individual flow): 10 steps, progress saved on every "Next" (so it resumes on
 * any device, web included), documents uploaded as they're picked, then
 * submitted for Movo's review. Fleet partners apply on the web.
 */
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, onboarding as onboardingApi } from "@movo/api";
import {
  VEHICLE_RENTAL_ENABLED, type OnboardingConsents, type OnboardingDocType, type OnboardingFields,
} from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/links";

const TOTAL_STEPS = 10;
const STEP_LABELS = ["Welcome", "Personal", "Vehicle", "Standards", "Test Assessment", "App Basics", "Safety", "Agreements", "Contract", "Review"];
const VEHICLE_TIERS = ["Economy (Standard)", "Premium (Executive)", "First Class (Concierge)"];
const VEHICLE_COLORS = ["Black", "White", "Silver", "Grey", "Dark Blue", "Other"];
const THIS_YEAR = new Date().getFullYear();
const VEHICLE_YEARS = Array.from({ length: 20 }, (_, i) => String(THIS_YEAR - i));
const DOB = /^\d{4}-\d{2}-\d{2}$/;
const gradient = ["#1a1a2e", "#131936", "#C6BFB2"] as const;

const PERSONAL_DOCS: { key: OnboardingDocType; label: string }[] = [
  { key: "DRIVERS_LICENSE", label: "Driver's License" },
  { key: "BACKGROUND_CHECK", label: "Background Check" },
  { key: "DRIVERS_ABSTRACT", label: "Driver's Abstract" },
  { key: "WORK_ELIGIBILITY", label: "Proof of Work Eligibility" },
];
const VEHICLE_DOCS: { key: OnboardingDocType; label: string }[] = [
  { key: "VEHICLE_REGISTRATION", label: "Vehicle Registration" },
  { key: "VEHICLE_INSURANCE", label: "Vehicle Insurance" },
  { key: "VEHICLE_PHOTO", label: "Vehicle Photos (interior/exterior)" },
];
const DOC_LABELS: Record<string, string> = {
  PROFILE_PHOTO: "Profile Photo", DRIVERS_LICENSE: "Driver's License", BACKGROUND_CHECK: "Background Check",
  DRIVERS_ABSTRACT: "Driver's Abstract", WORK_ELIGIBILITY: "Work Eligibility", VEHICLE_REGISTRATION: "Vehicle Registration",
  VEHICLE_INSURANCE: "Vehicle Insurance", VEHICLE_PHOTO: "Vehicle Photos",
};

type DocState = { fileName: string; status: "uploading" | "uploaded" | "failed" };

const EMPTY_FORM: OnboardingFields = {
  dob: "", licenseNumber: "", vehicleMake: "", vehicleModel: "", vehicleYear: "", vehiclePlate: "", vehicleTier: "",
  vehicleColor: "", bankAccountName: "", bankInstitution: "", bankAccountNumber: "", bankRoutingNumber: "", signature: "",
};
const NO_CONSENTS: OnboardingConsents = { gpsConsent: false, privacyPolicy: false, legalNotice: false, termsAccepted: false, contractSigned: false };

/* ── Small building blocks ─────────────────────────────────────────────── */

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>{sub}</Text>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function Box(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#9ca3af" {...props} style={[s.input, props.style]} />;
}

function Chips({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[s.chip, value === o && s.chipOn]}
          accessibilityRole="radio" accessibilityState={{ selected: value === o }}>
          <Text style={[s.chipText, value === o && { color: "#fff" }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}
      style={[s.check, checked && { borderColor: colors.navy, backgroundColor: "#f5f3ff" }]}>
      <View style={[s.box, checked && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
        {checked && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}
      </View>
      <Text style={s.checkText}>{children}</Text>
    </Pressable>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={s.info}>
      <Text style={s.infoTitle}>{title}</Text>
      {items.map((it) => (
        <View key={it} style={s.bullet}>
          <View style={s.dot} />
          <Text style={s.infoText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

function Consent({ title, description }: { title: string; description: string }) {
  return (
    <View style={s.info}>
      <Text style={s.infoTitle}>{title}</Text>
      <Text style={s.infoText}>{description}</Text>
    </View>
  );
}

function Upload({ label, doc, onPick }: { label: string; doc?: DocState; onPick: () => void }) {
  const done = doc?.status === "uploaded";
  return (
    <Pressable onPress={onPick} disabled={doc?.status === "uploading"} accessibilityRole="button"
      style={[s.upload, done && { borderColor: "#22c55e", backgroundColor: "#f0fdf4" }, doc?.status === "failed" && { borderColor: "#f87171" }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.uploadLabel}>{label}</Text>
        <Text style={s.uploadSub} numberOfLines={1}>
          {doc?.status === "uploading" ? "Uploading…" : doc?.status === "failed" ? "Upload failed — tap to try again"
            : done ? doc.fileName : "Tap to upload (photo or PDF)"}
        </Text>
      </View>
      {doc?.status === "uploading" ? <ActivityIndicator color={colors.navy} />
        : <Icon name={done ? "check" : "chevronRight"} size={18} color={done ? "#16a34a" : "#9ca3af"} />}
    </Pressable>
  );
}

function Nav({ onBack, next, nextLabel = "Next →", disabled, busy }: {
  onBack?: () => void; next: () => void; nextLabel?: string; disabled?: boolean; busy?: boolean;
}) {
  const off = disabled || busy;
  return (
    <View style={s.nav}>
      {onBack && (
        <Pressable onPress={onBack} style={[s.btn, s.outline]} accessibilityRole="button">
          <Text style={[s.btnText, { color: "#374151" }]}>← Back</Text>
        </Pressable>
      )}
      <Pressable onPress={next} disabled={off} style={{ flex: 1 }} accessibilityRole="button">
        {off ? (
          <View style={[s.btn, { backgroundColor: "#d1d5db" }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{nextLabel}</Text>}
          </View>
        ) : (
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
            <Text style={s.btnText}>{nextLabel}</Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

/* ── Screen ─────────────────────────────────────────────────────────────── */

export default function Onboarding() {
  const driver = useSession((st) => st.driver);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [vehicleOption, setVehicleOption] = useState<"OWN" | "RENT" | "">(VEHICLE_RENTAL_ENABLED ? "" : "OWN");
  const [form, setForm] = useState<OnboardingFields>(EMPTY_FORM);
  const [consents, setConsents] = useState<OnboardingConsents>(NO_CONSENTS);
  const [docs, setDocs] = useState<Partial<Record<OnboardingDocType, DocState>>>({});
  const [standards, setStandards] = useState(false);
  const [assessment, setAssessment] = useState(false);
  const [appBasics, setAppBasics] = useState(false);
  const [safetyReview, setSafetyReview] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  /* Resume saved progress (from the app or the web) */
  useEffect(() => {
    onboardingApi.get().then(({ exists, onboarding: o }) => {
      if (!exists || !o) return;
      if (o.currentStep && o.currentStep > 1) setStep(Math.min(o.currentStep, TOTAL_STEPS));
      if (o.submittedAt) setSubmitted(true);
      if (o.vehicleOption) setVehicleOption(VEHICLE_RENTAL_ENABLED ? o.vehicleOption : "OWN");
      setForm((prev) => {
        const next = { ...prev };
        (Object.keys(EMPTY_FORM) as (keyof OnboardingFields)[]).forEach((k) => { next[k] = o[k] ?? ""; });
        return next;
      });
      setConsents({
        gpsConsent: !!o.gpsConsentAt, privacyPolicy: !!o.privacyPolicyAt, legalNotice: !!o.legalNoticeAt,
        termsAccepted: !!o.termsAcceptedAt, contractSigned: !!o.contractSignedAt,
      });
      const restored: Partial<Record<OnboardingDocType, DocState>> = {};
      for (const d of o.documents ?? []) restored[d.type] = { fileName: d.fileName, status: "uploaded" };
      setDocs(restored);
      /* Acknowledgement steps already passed don't need ticking again */
      const at = o.currentStep ?? 1;
      setStandards(at > 4);
      setAssessment(at > 5);
      setAppBasics(at > 6);
      setSafetyReview(at > 7);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const setField = (k: keyof OnboardingFields, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setConsent = (k: keyof OnboardingConsents, v: boolean) => setConsents((p) => ({ ...p, [k]: v }));
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });

  const upload = async (key: OnboardingDocType, file: { uri: string; name: string; type: string }) => {
    setDocs((p) => ({ ...p, [key]: { fileName: file.name, status: "uploading" } }));
    try {
      await onboardingApi.uploadDocument(key, file);
      setDocs((p) => ({ ...p, [key]: { fileName: file.name, status: "uploaded" } }));
    } catch (e) {
      setDocs((p) => ({ ...p, [key]: { fileName: file.name, status: "failed" } }));
      Alert.alert("Upload failed", e instanceof ApiError && e.status !== 0 ? e.message : "Check your connection and try again.");
    }
  };

  const pickPhoto = async (key: OnboardingDocType, square = false) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, allowsEditing: square, aspect: [1, 1] });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    const type = a.mimeType ?? "image/jpeg";
    await upload(key, { uri: a.uri, name: a.fileName ?? `${key.toLowerCase()}.${type.split("/")[1] ?? "jpg"}`, type });
  };

  const pickFile = async (key: OnboardingDocType) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    await upload(key, { uri: a.uri, name: a.name, type: a.mimeType ?? "application/pdf" });
  };

  const pick = (key: OnboardingDocType) =>
    Alert.alert(DOC_LABELS[key] ?? "Upload document", "Choose a photo or a PDF (max 10 MB).", [
      { text: "Photo library", onPress: () => pickPhoto(key) },
      { text: "Files (PDF)", onPress: () => pickFile(key) },
      { text: "Cancel", style: "cancel" },
    ]);

  const uploaded = (k: OnboardingDocType) => docs[k]?.status === "uploaded";

  /* Saves everything so far, then moves on */
  const next = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    setError(null);
    try {
      await onboardingApi.save({
        type: "INDIVIDUAL", currentStep: Math.min(step + 1, TOTAL_STEPS),
        vehicleOption: vehicleOption || undefined, ...form, ...consents, ...extra,
      });
      setStep((p) => Math.min(p + 1, TOTAL_STEPS));
      top();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't save your progress. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  const back = () => { setStep((p) => Math.max(p - 1, 1)); top(); };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onboardingApi.save({ currentStep: TOTAL_STEPS, completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9], submit: true });
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      top();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't submit. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const done = () => router.replace("/account-status");

  if (loading) {
    return <SafeAreaView style={s.center}><ActivityIndicator color={colors.navy} /></SafeAreaView>;
  }

  const body = (() => {
    switch (step) {
      case 1:
        return (
          <>
            <LinearGradient colors={["#1a1a2e", "#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <Text style={s.heroKicker}>CHAUFFEUR ONBOARDING</Text>
              <Text style={s.heroTitle}>Welcome to Movo,{"\n"}<Text style={{ color: colors.taupe }}>{driver?.firstName ?? "Chauffeur"}</Text></Text>
              <Text style={s.heroBody}>You&apos;re just 9 steps away from joining our elite chauffeur network. This process takes approximately 15 minutes.</Text>
              <View style={s.heroStats}>
                {[["9", "Steps"], ["15min", "Avg. time"], ["24h", "Review"]].map(([v, l]) => (
                  <View key={l} style={s.heroStat}><Text style={s.heroStatVal}>{v}</Text><Text style={s.heroStatLbl}>{l}</Text></View>
                ))}
              </View>
            </LinearGradient>
            <Text style={s.label}>What you&apos;ll complete</Text>
            {[
              ["01", "Personal Verification", "ID, license & background check"],
              ["02", "Vehicle Verification", "Registration, insurance & photos"],
              ["03", "Standards & Training", "Movo service standards"],
              ["04", "Safety Procedures", "Emergency protocols & GPS consent"],
              ["05", "Agreements & Contract", "Terms, privacy & digital signature"],
            ].map(([n, l, d]) => (
              <View key={n} style={s.outline2}>
                <Text style={s.num}>{n}</Text>
                <View style={{ flex: 1 }}><Text style={s.itemTitle}>{l}</Text><Text style={s.sub}>{d}</Text></View>
              </View>
            ))}
            <Nav next={() => next()} nextLabel="Begin Onboarding →" busy={saving} />
          </>
        );

      case 2:
        return (
          <>
            <Title title="Personal Verification" sub="Upload your personal documents and verify your identity." />
            <Upload label="Profile Photo" doc={docs.PROFILE_PHOTO} onPick={() => pickPhoto("PROFILE_PHOTO", true)} />
            <Field label="Date of Birth" required>
              <Box value={form.dob} onChangeText={(v) => setField("dob", v)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
            </Field>
            {form.dob && !DOB.test(form.dob) ? <Text style={s.warn}>Use the format YYYY-MM-DD, e.g. 1990-04-21.</Text> : null}
            <Field label="Driver's License Number" required>
              <Box value={form.licenseNumber} onChangeText={(v) => setField("licenseNumber", v)} placeholder="e.g. A1234-56789" autoCapitalize="characters" />
            </Field>
            <Text style={s.label}>Required Documents</Text>
            {PERSONAL_DOCS.map((d) => <Upload key={d.key} label={d.label} doc={docs[d.key]} onPick={() => pick(d.key)} />)}
            <Nav onBack={back} next={() => next()} busy={saving}
              disabled={!DOB.test(form.dob) || !form.licenseNumber.trim() || !PERSONAL_DOCS.every((d) => uploaded(d.key))} />
          </>
        );

      case 3:
        return (
          <>
            <Title title="Vehicle" sub="Tell us how you'll be driving with Movo." />
            <Check checked={vehicleOption === "OWN"} onChange={() => setVehicleOption("OWN")}>
              I Have My Own Vehicle — provide your vehicle details and documents for verification.
            </Check>
            {VEHICLE_RENTAL_ENABLED && (
              <Check checked={vehicleOption === "RENT"} onChange={() => setVehicleOption("RENT")}>
                Rent a Vehicle from Movo — no car of your own? Rent an approved vehicle from Movo once your application is approved.
              </Check>
            )}
            {vehicleOption === "OWN" && (
              <>
                <Field label="Make" required><Box value={form.vehicleMake} onChangeText={(v) => setField("vehicleMake", v)} placeholder="e.g. Mercedes" /></Field>
                <Field label="Model" required><Box value={form.vehicleModel} onChangeText={(v) => setField("vehicleModel", v)} placeholder="e.g. S-Class" /></Field>
                <Field label="Year" required><Chips value={form.vehicleYear} options={VEHICLE_YEARS} onChange={(v) => setField("vehicleYear", v)} /></Field>
                <Field label="Color" required><Chips value={form.vehicleColor} options={VEHICLE_COLORS} onChange={(v) => setField("vehicleColor", v)} /></Field>
                <Field label="License Plate" required>
                  <Box value={form.vehiclePlate} onChangeText={(v) => setField("vehiclePlate", v)} placeholder="e.g. ABC-1234" autoCapitalize="characters" />
                </Field>
                <Field label="Vehicle Class" required><Chips value={form.vehicleTier} options={VEHICLE_TIERS} onChange={(v) => setField("vehicleTier", v)} /></Field>
                <Text style={s.label}>Vehicle Documents</Text>
                {VEHICLE_DOCS.map((d) => <Upload key={d.key} label={d.label} doc={docs[d.key]} onPick={() => pick(d.key)} />)}
              </>
            )}
            {vehicleOption === "RENT" && (
              <Text style={s.sub}>You&apos;ll be able to browse and rent an available Movo vehicle from your chauffeur dashboard once your application is approved.</Text>
            )}
            <Nav onBack={back} next={() => next({ vehicleOption })} busy={saving}
              disabled={!vehicleOption || (vehicleOption === "OWN" && (
                !form.vehicleMake.trim() || !form.vehicleModel.trim() || !form.vehicleYear || !form.vehicleColor ||
                !form.vehiclePlate.trim() || !form.vehicleTier || !VEHICLE_DOCS.every((d) => uploaded(d.key))))} />
          </>
        );

      case 4:
        return (
          <>
            <Title title="Chauffeur Standards" sub="Please read and acknowledge our service standards before proceeding." />
            <Info title="Professional Appearance" items={[
              "Dark, clean, wrinkle-free business attire at all times",
              "Well-groomed appearance — hair, nails, and hygiene standards",
              "No strong fragrances; subtle professional presentation",
              "Polished shoes — no trainers or casual footwear",
            ]} />
            <Info title="Client Service Standards" items={[
              "Always greet clients by name and open vehicle doors",
              "Maintain a quiet, professional environment unless client initiates",
              "Assist with luggage promptly and carefully",
              "Zero tolerance for phone use while driving",
              "Arrive 5–10 minutes early for every booking",
            ]} />
            <Info title="Punctuality & Reliability" items={[
              "Accepting a booking is a firm commitment — no no-shows",
              "Notify Movo immediately if unavoidable delays occur",
              "Three cancellations within 30 days triggers account review",
            ]} />
            <Info title="Vehicle Cleanliness" items={[
              "Vehicle must be spotless before every trip — interior and exterior",
              "No food, strong odours, or personal items visible in the vehicle",
              "Offer water and a fresh ambient setting for every client",
            ]} />
            <Check checked={standards} onChange={setStandards}>
              I have read and understood the Movo Chauffeur Standards & Expectations. I commit to upholding these standards on every trip.
            </Check>
            <Nav onBack={back} next={() => next()} disabled={!standards} busy={saving} />
          </>
        );

      case 5:
        return (
          <>
            <Title title="Standards Assessment" sub="Test your knowledge of Movo standards and procedures." />
            <Consent title="Assessment Coming Soon" description="The Movo team is preparing your assessment. You can mark this as complete for now." />
            <Check checked={assessment} onChange={setAssessment}>
              I understand the assessment will be available soon. I have reviewed the standards and am ready to proceed.
            </Check>
            <Nav onBack={back} next={() => next()} disabled={!assessment} busy={saving} />
          </>
        );

      case 6:
        return (
          <>
            <Title title="Chauffeur App Basics" sub="Familiarise yourself with how the Movo app works." />
            <Info title="Going Online & Accepting Rides" items={[
              "Toggle your status to Online on the home screen to begin receiving bookings",
              "Incoming bookings show client name, pickup location, and trip details",
              "You have 30 seconds to accept before the ride is offered to another chauffeur",
              "Declining too frequently will affect your availability ranking",
            ]} />
            <Info title="Navigation & Route" items={[
              "Always follow the assigned pickup and drop-off route",
              "Route deviations must be communicated to the client and logged",
              "Use the in-app map for live turn-by-turn navigation",
            ]} />
            <Info title="Communication with Clients" items={[
              "Use only the in-app messaging system to contact clients",
              "Do not share your personal contact details with clients",
              "Be responsive — unread messages must be addressed before departure",
            ]} />
            <Info title="Earnings & Payments" items={[
              "All payments are processed by Movo — no cash handling required",
              "Earnings are deposited to your registered bank account weekly",
              "View trip history, earnings, and ratings in the Wallet section",
            ]} />
            <Check checked={appBasics} onChange={setAppBasics}>
              I have reviewed and understood the Chauffeur App Basics. I am ready to operate the app professionally.
            </Check>
            <Nav onBack={back} next={() => next()} disabled={!appBasics} busy={saving} />
          </>
        );

      case 7:
        return (
          <>
            <Title title="Safety & Emergency Procedures" sub="Your safety and your clients' safety is our top priority." />
            <Info title="Emergency Contacts & Protocols" items={[
              "In a life-threatening emergency, call 911 (or local emergency number) immediately",
              "Use the in-app SOS button to alert Movo dispatch in real time",
              "Pull to a safe location before making emergency calls while driving",
            ]} />
            <Info title="Accident Procedures" items={[
              "Ensure all parties are safe before contacting Movo",
              "Do not admit fault or liability at the scene",
              "Document the incident with photos and submit via the in-app incident report",
              "Movo's support team is available 24/7 for guidance",
            ]} />
            <Info title="Incident Reporting" items={[
              "Use the in-app 'Report Incident' button during or after any trip concern",
              "Include a clear description and any relevant information",
              "Movo may trigger an AI-assisted review or assign a case manager",
            ]} />
            <Consent title="GPS Tracking Notice"
              description="Movo uses real-time GPS tracking during active trips for client safety, route verification, and dispute resolution. Location data is stored securely and used only for operational and safety purposes. You may review our Privacy Policy for full details." />
            <Check checked={safetyReview} onChange={setSafetyReview}>
              I have read and understood the Safety & Emergency Procedures and acknowledge the GPS tracking notice.
            </Check>
            <Nav onBack={back} next={() => next()} disabled={!safetyReview} busy={saving} />
          </>
        );

      case 8:
        return (
          <>
            <Title title="Agreement Summary" sub="Please review and acknowledge each of the following before signing the full contract." />
            <Consent title="GPS Tracking Consent" description="I consent to real-time GPS tracking of my location during active trips for client safety, navigation, and dispute resolution purposes." />
            <Check checked={consents.gpsConsent} onChange={(v) => setConsent("gpsConsent", v)}>I consent to GPS tracking during active trips as described above.</Check>
            <Consent title="Privacy Policy Acknowledgement" description="Movo collects and processes personal data in accordance with applicable privacy laws. Your data is used solely for operational, safety, and payment purposes." />
            <Check checked={consents.privacyPolicy} onChange={(v) => setConsent("privacyPolicy", v)}>I have read and accept the Movo Privacy Policy.</Check>
            <Text style={s.link} onPress={() => openWeb("/privacy-policy")}>Read the Privacy Policy</Text>
            <Consent title="Legal Notice Acknowledgement" description="You are registering as an independent chauffeur. Movo is a technology platform and does not constitute an employment relationship." />
            <Check checked={consents.legalNotice} onChange={(v) => setConsent("legalNotice", v)}>I acknowledge the legal notice regarding my status as an independent contractor.</Check>
            <Consent title="Terms & Conditions" description="By joining Movo, you agree to abide by our Chauffeur Terms & Conditions including the code of conduct, payment terms, and cancellation policy." />
            <Check checked={consents.termsAccepted} onChange={(v) => setConsent("termsAccepted", v)}>I accept the Movo Chauffeur Terms & Conditions.</Check>
            <Text style={s.link} onPress={() => openWeb("/terms")}>Read the Terms & Conditions</Text>
            <Nav onBack={back} busy={saving}
              next={() => next({ gpsConsent: consents.gpsConsent, privacyPolicy: consents.privacyPolicy, legalNotice: consents.legalNotice, termsAccepted: consents.termsAccepted })}
              disabled={!consents.gpsConsent || !consents.privacyPolicy || !consents.legalNotice || !consents.termsAccepted} />
          </>
        );

      case 9:
        return (
          <>
            <Title title="Chauffeur Agreement" sub="Read the full agreement and sign with your legal name." />
            <View style={s.info}>
              <Text style={s.infoTitle}>Chauffeur Services Agreement</Text>
              <Text style={s.sub}>Movo · Independent Chauffeur</Text>
              <Text style={s.infoText}>
                This Agreement is entered into between <Text style={s.b}>Movo</Text> (&quot;Platform&quot;) and the individual chauffeur (&quot;Chauffeur&quot;) registering through this onboarding process.{"\n\n"}
                <Text style={s.b}>1. Independent Contractor Status.</Text> The Chauffeur operates as an independent contractor. Nothing in this Agreement creates an employer-employee relationship, partnership, or agency.{"\n\n"}
                <Text style={s.b}>2. Service Standards.</Text> Chauffeur agrees to uphold all Movo service standards including appearance, punctuality, vehicle maintenance, and client interaction protocols.{"\n\n"}
                <Text style={s.b}>3. GPS & Data Consent.</Text> Chauffeur consents to real-time GPS tracking during active trips. Location data is retained for 90 days for safety and dispute resolution purposes.{"\n\n"}
                <Text style={s.b}>4. Payments.</Text> Movo will remit earnings to the Chauffeur&apos;s registered bank account on a weekly basis after applicable platform fees are deducted.{"\n\n"}
                <Text style={s.b}>5. Conduct.</Text> Harassment, discrimination, or unsafe driving will result in immediate suspension and potential legal action.{"\n\n"}
                <Text style={s.b}>6. Termination.</Text> Either party may terminate this agreement with 14 days written notice. Movo reserves the right to immediately suspend accounts for policy violations.{"\n\n"}
                <Text style={s.b}>7. Governing Law.</Text> This agreement is governed by the laws of the applicable jurisdiction.
              </Text>
            </View>
            <Text style={s.label}>Payout account</Text>
            <Upload label="Banking / Payout Information Document (Optional)" doc={docs.BANKING_INFO} onPick={() => pick("BANKING_INFO")} />
            <Field label="Account Holder Name" required><Box value={form.bankAccountName} onChangeText={(v) => setField("bankAccountName", v)} placeholder="Full legal name" /></Field>
            <Field label="Bank / Institution" required><Box value={form.bankInstitution} onChangeText={(v) => setField("bankInstitution", v)} placeholder="e.g. RBC" /></Field>
            <Field label="Account Number" required><Box value={form.bankAccountNumber} onChangeText={(v) => setField("bankAccountNumber", v)} keyboardType="number-pad" placeholder="•••• •••• ••••" /></Field>
            <Field label="Routing / Transit #"><Box value={form.bankRoutingNumber} onChangeText={(v) => setField("bankRoutingNumber", v)} keyboardType="numbers-and-punctuation" placeholder="e.g. 004-12345" /></Field>
            <Text style={s.label}>Digital Signature</Text>
            <Text style={s.sub}>Type your full legal name below to sign this agreement. By signing, you confirm you have read and agree to all terms.</Text>
            <Box value={form.signature} onChangeText={(v) => setField("signature", v)} placeholder="Your full legal name"
              style={{ fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontStyle: "italic", fontSize: 18 }} />
            <Check checked={consents.contractSigned} onChange={(v) => setConsent("contractSigned", v)}>
              By typing my name above, I confirm I have read, understood, and agree to the Movo Chauffeur Agreement in its entirety.
            </Check>
            <Nav onBack={back} next={() => next({ contractSigned: true })} nextLabel="Continue to review →" busy={saving}
              disabled={!form.signature.trim() || !consents.contractSigned || !form.bankAccountName.trim() || !form.bankInstitution.trim() || !form.bankAccountNumber.trim()} />
          </>
        );

      default: {
        if (submitted) {
          return (
            <View style={{ gap: 14, alignItems: "center", paddingTop: 24 }}>
              <LinearGradient colors={["#131936", "#C6BFB2"]} style={s.doneBadge}><Icon name="check" size={30} color="#fff" strokeWidth={2.5} /></LinearGradient>
              <Text style={s.title}>Application Submitted!</Text>
              <Text style={[s.sub, { textAlign: "center" }]}>Your Movo chauffeur application is under review. Our team will contact you within 24–48 hours.</Text>
              <View style={[s.info, { alignSelf: "stretch" }]}>
                <Text style={s.infoTitle}>What happens next?</Text>
                {["Our team will review your documents", "A background verification will be initiated", "You'll receive an email confirmation within 24h", "Account activation follows approval"].map((t) => (
                  <View key={t} style={s.bullet}><View style={s.dot} /><Text style={s.infoText}>{t}</Text></View>
                ))}
              </View>
              <View style={{ alignSelf: "stretch" }}><Nav next={done} nextLabel="Done" /></View>
            </View>
          );
        }
        const docTypes: OnboardingDocType[] = vehicleOption === "RENT"
          ? ["PROFILE_PHOTO", "DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT", "WORK_ELIGIBILITY"]
          : ["PROFILE_PHOTO", "DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT", "WORK_ELIGIBILITY", "VEHICLE_REGISTRATION", "VEHICLE_INSURANCE", "VEHICLE_PHOTO"];
        const count = docTypes.filter(uploaded).length;
        const items = [
          { label: "Personal information", ok: DOB.test(form.dob) && !!form.licenseNumber, back: 2 },
          { label: "Vehicle information", ok: vehicleOption === "RENT" || (!!form.vehicleMake && !!form.vehiclePlate), back: 3 },
          { label: "Documents uploaded", ok: count === docTypes.length, note: `${count}/${docTypes.length}`, back: uploaded("PROFILE_PHOTO") ? 3 : 2 },
          { label: "Chauffeur standards acknowledged", ok: standards, back: 4 },
          { label: "App basics reviewed", ok: appBasics, back: 6 },
          { label: "Safety procedures reviewed", ok: safetyReview, back: 7 },
          { label: "GPS consent", ok: consents.gpsConsent, back: 8 },
          { label: "Privacy policy accepted", ok: consents.privacyPolicy, back: 8 },
          { label: "Legal notice acknowledged", ok: consents.legalNotice, back: 8 },
          { label: "Terms & conditions accepted", ok: consents.termsAccepted, back: 8 },
          { label: "Contract signed", ok: consents.contractSigned && !!form.signature, back: 9 },
          { label: "Banking information", ok: !!form.bankAccountName, back: 9 },
        ];
        const all = items.every((i) => i.ok);
        return (
          <>
            <Title title="Final Review" sub="Review your application before submitting for admin approval." />
            {items.map((i) => (
              <Pressable key={i.label} disabled={i.ok} onPress={() => { setStep(i.back); top(); }}
                style={[s.review, { backgroundColor: i.ok ? "#f0fdf4" : "#fef2f2", borderColor: i.ok ? "#bbf7d0" : "#fecaca" }]}>
                <Icon name={i.ok ? "check" : "alert"} size={15} color={i.ok ? "#16a34a" : "#dc2626"} strokeWidth={2.5} />
                <Text style={s.reviewLabel}>{i.label}</Text>
                <Text style={[s.reviewNote, { color: i.ok ? "#16a34a" : "#dc2626" }]}>{i.note ?? (i.ok ? "Complete" : "Fix →")}</Text>
              </Pressable>
            ))}
            {!uploaded("PROFILE_PHOTO") && <Text style={s.sub}>Tap a missing item to go back and complete it. The profile photo is on the Personal step.</Text>}
            <Nav onBack={back} next={submit} nextLabel="Submit Application" disabled={!all} busy={saving} />
          </>
        );
      }
    }
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {!(step === TOTAL_STEPS && submitted) && (
        <View style={s.top}>
          <View style={s.topRow}>
            <Pressable onPress={done} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={s.close}>Save & exit</Text>
            </Pressable>
            <Text style={s.stepLabel}>Step {step} of {TOTAL_STEPS} · {STEP_LABELS[step - 1]}</Text>
          </View>
          <View style={s.track}>
            <LinearGradient colors={["#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.bar, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
          </View>
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
          {body}
          {error && <Text style={s.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  top: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  close: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#6b7280" },
  stepLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.navy },
  track: { height: 5, borderRadius: 3, backgroundColor: "#f3f4f6", overflow: "hidden" },
  bar: { height: 5, borderRadius: 3 },
  page: { padding: 20, gap: 14, paddingBottom: 48 },
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  sub: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", lineHeight: 19 },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#374151" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: "#111827", backgroundColor: "#fafafa" },
  warn: { fontFamily: fonts.body, fontSize: 11, color: "#d97706", marginTop: -8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fafafa" },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  check: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fafafa" },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#d1d5db", backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 19 },
  info: { padding: 16, borderRadius: 14, backgroundColor: "#f8f7f4", gap: 8 },
  infoTitle: { fontFamily: fonts.heading, fontSize: 14, color: colors.navy },
  infoText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: "#4b5563", lineHeight: 19 },
  b: { fontFamily: fonts.bodySemi, color: "#1f2937" },
  bullet: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.taupe, marginTop: 7 },
  upload: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#e5e7eb", backgroundColor: "#fafafa" },
  uploadLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  uploadSub: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", marginTop: 2 },
  nav: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  outline: { borderWidth: 1, borderColor: "#d1d5db", minWidth: 110 },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#fff" },
  link: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy, marginTop: -6 },
  hero: { borderRadius: 22, padding: 22, gap: 10 },
  heroKicker: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,0.6)" },
  heroTitle: { fontFamily: fonts.heading, fontSize: 22, color: "#fff", lineHeight: 28 },
  heroBody: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 19 },
  heroStats: { flexDirection: "row", gap: 10, marginTop: 4 },
  heroStat: { flex: 1, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", paddingVertical: 10, alignItems: "center" },
  heroStatVal: { fontFamily: fonts.heading, fontSize: 16, color: "#fff" },
  heroStatLbl: { fontFamily: fonts.body, fontSize: 10, color: "rgba(255,255,255,0.7)" },
  outline2: { flexDirection: "row", gap: 14, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#f3f4f6" },
  num: { fontFamily: fonts.heading, fontSize: 15, color: colors.navy, width: 26 },
  itemTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  review: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  reviewLabel: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 12, color: "#1f2937" },
  reviewNote: { fontFamily: fonts.bodySemi, fontSize: 11 },
  doneBadge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", textAlign: "center" },
});

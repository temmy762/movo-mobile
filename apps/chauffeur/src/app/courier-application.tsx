/**
 * Movo Courier driver application — mirrors movo-web driver/onboarding/courier.
 * Step 0 is Movo's "Become a Movo Courier Driver" page, then 6 steps:
 * about you, documents, vehicle, responsibilities, agreement, review.
 * No banking: approved drivers connect their bank in the app afterwards.
 */
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, onboarding as onboardingApi } from "@movo/api";
import {
  COURIER_BANKING_NOTE, COURIER_DOCUMENTS, COURIER_DRIVER_INTRO, COURIER_DRIVER_REQUIREMENTS, COURIER_DRIVER_RESPONSIBILITIES,
  COURIER_DRIVER_WHY, COURIER_GET_STARTED, COURIER_LICENSE_CLASSES, COURIER_MIN_AGE, COURIER_MIN_YEARS_DRIVING,
  COURIER_NO_EXPERIENCE, COURIER_SERVICE_AREAS, COURIER_VEHICLE_NOTE, COURIER_VEHICLE_TYPES, type OnboardingDocType,
} from "@movo/shared";
import { Icon, colors, fonts } from "@movo/ui";
import { useSession } from "@/lib/session";
import { openWeb } from "@/lib/links";
import { AgreementText, CheckRow } from "@/components/CourierAgreementForm";

type DocState = { fileName: string; status: "uploading" | "uploaded" | "failed" };
const STEPS = ["About you", "Documents", "Vehicle", "Responsibilities", "Agreement", "Review"];
const THIS_YEAR = new Date().getFullYear();
const COLORS = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Other"];
const DOC_LABEL = Object.fromEntries(COURIER_DOCUMENTS.map((d) => [d.key, d.label])) as Record<string, string>;

function ageOf(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age--;
  return age;
}

function Label({ children }: { children: ReactNode }) { return <Text style={s.label}>{children}</Text>; }
function Bullets({ items }: { items: readonly string[] }) {
  return <View style={{ gap: 4 }}>{items.map((t) => <Text key={t} style={s.body}>•  {t}</Text>)}</View>;
}
function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[s.chip, value === o.id && s.chipOn]}
          accessibilityRole="radio" accessibilityState={{ selected: value === o.id }}>
          <Text style={[s.chipText, value === o.id && { color: "#fff" }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CourierApplication() {
  const { signOut } = useSession();
  const qc = useQueryClient();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [docs, setDocs] = useState<Record<string, DocState>>({});
  const [f, setF] = useState({
    dob: "", licenseNumber: "", licenseClass: "", licensedSince: "",
    vehicleType: "", vehicleMake: "", vehicleModel: "", vehicleYear: "", vehicleColor: "", vehiclePlate: "", signature: "",
  });
  const [insurance, setInsurance] = useState(false);
  const [responsibilities, setResponsibilities] = useState(false);
  const [signed, setSigned] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });

  useEffect(() => {
    onboardingApi.get().then((d) => {
      const o = d.onboarding;
      if (!d.exists || !o) return;
      if (o.submittedAt) { setSubmitted(true); setStep(6); }
      else if ((o.currentStep ?? 1) > 1) setStep(Math.min(o.currentStep ?? 1, 6));
      setF((p) => ({
        ...p,
        dob: o.dob ?? "", licenseNumber: o.licenseNumber ?? "", licenseClass: o.licenseClass ?? "", licensedSince: o.licensedSince ?? "",
        vehicleType: o.vehicleType ?? "", vehicleMake: o.vehicleMake ?? "", vehicleModel: o.vehicleModel ?? "", vehicleYear: o.vehicleYear ?? "",
        vehicleColor: o.vehicleColor ?? "", vehiclePlate: o.vehiclePlate ?? "", signature: o.signature ?? "",
      }));
      setInsurance(!!o.courierInsuranceConfirmedAt);
      setResponsibilities(!!o.responsibilitiesAckAt);
      setSigned(!!o.contractSignedAt);
      setTerms(!!o.termsAcceptedAt);
      setPrivacy(!!o.privacyPolicyAt);
      const restored: Record<string, DocState> = {};
      for (const doc of o.documents ?? []) restored[doc.type] = { fileName: doc.fileName, status: "uploaded" };
      setDocs(restored);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
  const pickPhoto = async (key: OnboardingDocType, camera = false) => {
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    const type = a.mimeType ?? "image/jpeg";
    await upload(key, { uri: a.uri, name: a.fileName ?? `${key.toLowerCase()}.${type.split("/")[1] ?? "jpg"}`, type });
  };
  const pickFile = async (key: OnboardingDocType) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    const a = res.canceled ? null : res.assets[0];
    if (a) await upload(key, { uri: a.uri, name: a.name, type: a.mimeType ?? "application/pdf" });
  };
  const pick = (key: OnboardingDocType) =>
    Alert.alert(DOC_LABEL[key] ?? "Upload document", "Choose a photo or a PDF (max 10 MB).", [
      { text: "Take photo", onPress: () => pickPhoto(key, true) },
      { text: "Photo library", onPress: () => pickPhoto(key) },
      { text: "Files (PDF)", onPress: () => pickFile(key) },
      { text: "Cancel", style: "cancel" },
    ]);
  const uploaded = (keys: string[]) => keys.every((k) => docs[k]?.status === "uploaded");

  const renderUpload = (k: OnboardingDocType) => {
    const d = docs[k];
    const done = d?.status === "uploaded";
    return (
      <Pressable key={k} onPress={() => pick(k)} disabled={d?.status === "uploading"} accessibilityRole="button"
        style={[s.upload, done && { borderColor: "#22c55e", backgroundColor: "#f0fdf4" }, d?.status === "failed" && { borderColor: "#f87171" }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.uploadLabel}>* {DOC_LABEL[k]}</Text>
          <Text style={s.uploadSub} numberOfLines={1}>
            {d?.status === "uploading" ? "Uploading…" : d?.status === "failed" ? "Upload failed — tap to try again" : done ? d.fileName : "Tap to upload (photo or PDF)"}
          </Text>
        </View>
        {d?.status === "uploading" ? <ActivityIndicator color={colors.navy} /> : <Icon name={done ? "check" : "chevronRight"} size={18} color={done ? "#16a34a" : "#9ca3af"} />}
      </Pressable>
    );
  };

  const save = (extra: Record<string, unknown>) => onboardingApi.save({ type: "COURIER", ...f, ...extra });

  const stepError = (): string | null => {
    if (step === 1) {
      if (!uploaded(["PROFILE_PHOTO"])) return "Upload a profile picture.";
      const age = ageOf(f.dob);
      if (age == null) return "Enter your date of birth as YYYY-MM-DD.";
      if (age < COURIER_MIN_AGE) return `Courier drivers must be at least ${COURIER_MIN_AGE} years old.`;
      if (!f.licenseNumber.trim() || !f.licenseClass) return "Enter your licence number and class.";
      if (!/^\d{4}$/.test(f.licensedSince) || THIS_YEAR - Number(f.licensedSince) < COURIER_MIN_YEARS_DRIVING) return `You need at least ${COURIER_MIN_YEARS_DRIVING} year of driving experience.`;
    }
    if (step === 2 && !uploaded(["DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT", "WORK_ELIGIBILITY"])) return "Upload all four documents.";
    if (step === 3) {
      if (!f.vehicleType || !f.vehicleMake.trim() || !f.vehicleModel.trim() || !/^\d{4}$/.test(f.vehicleYear) || !f.vehicleColor || !f.vehiclePlate.trim()) return "Complete your vehicle details.";
      if (!uploaded(["VEHICLE_REGISTRATION", "VEHICLE_PHOTO"])) return "Upload your registration and insurance, and vehicle photos.";
      if (!insurance) return "Please confirm your vehicle and insurance meet the requirements.";
    }
    if (step === 4 && !responsibilities) return "Please confirm the driver responsibilities.";
    if (step === 5) {
      if (!f.signature.trim() || !signed) return "Type your full legal name and tick the box to sign.";
      if (!terms || !privacy) return "Please accept the Terms and Privacy Policy.";
    }
    return null;
  };

  const next = async () => {
    setError(null);
    const problem = stepError();
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await save({
        currentStep: step + 1,
        ...(step === 3 ? { courierInsuranceConfirmed: insurance } : {}),
        ...(step === 4 ? { responsibilitiesAck: responsibilities } : {}),
        ...(step === 5 ? { contractSigned: true, termsAccepted: terms, privacyPolicy: privacy } : {}),
      });
      setStep((x) => x + 1);
      top();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null); setBusy(true);
    try {
      await save({ currentStep: 6, completedSteps: [1, 2, 3, 4, 5, 6], submit: true });
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["onboarding-status"] });
      top();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    try { await save({ currentStep: 1 }); } catch { /* saved again on Continue */ }
    setStep(1); top();
  };

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator color={colors.navy} /></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <View style={s.header}>
        {step > 0 && !submitted ? (
          <Pressable onPress={() => { setStep((x) => x - 1); top(); }} hitSlop={10} accessibilityRole="button"><Text style={s.headerLink}>← Back</Text></Pressable>
        ) : <View />}
        <Pressable onPress={() => (router.canGoBack() ? router.back() : signOut())} hitSlop={10} accessibilityRole="button">
          <Text style={s.headerLink}>{router.canGoBack() ? "Close" : "Sign out"}</Text>
        </Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        {step > 0 && !submitted && (
          <View style={{ marginBottom: 8 }}>
            <Text style={s.kicker}>Courier driver application · Step {step} of {STEPS.length}</Text>
            <Text style={s.title}>{STEPS[step - 1]}</Text>
            <View style={s.bar}><View style={[s.barFill, { width: `${(step / STEPS.length) * 100}%` }]} /></View>
          </View>
        )}

        {step === 0 && (
          <>
            <View style={s.hero}>
              <Text style={[s.kicker, { color: colors.taupe }]}>MOVO COURIER</Text>
              <Text style={s.heroTitle}>{COURIER_DRIVER_INTRO.title}</Text>
              <Text style={[s.body, { color: colors.taupe }]}>{COURIER_DRIVER_INTRO.tagline}</Text>
            </View>
            {COURIER_DRIVER_INTRO.body.map((p) => <Text key={p} style={s.body}>{p}</Text>)}
            <Text style={s.h2}>Why Drive with Movo Courier?</Text><Bullets items={COURIER_DRIVER_WHY} />
            <Text style={s.h2}>Service Areas</Text>
            <Text style={s.body}>{COURIER_SERVICE_AREAS.planned}</Text>
            <Text style={s.label}>Pilot Launch Routes:</Text><Bullets items={COURIER_SERVICE_AREAS.pilot} />
            <Text style={s.muted}>{COURIER_SERVICE_AREAS.note}</Text>
            <Text style={s.h2}>Driver Requirements</Text><Bullets items={COURIER_DRIVER_REQUIREMENTS} />
            <Text style={[s.body, { fontFamily: fonts.bodySemi }]}>{COURIER_NO_EXPERIENCE}</Text>
            <Text style={s.h2}>Eligible Vehicles</Text><Bullets items={COURIER_VEHICLE_TYPES.map((v) => v.label)} />
            <Text style={s.muted}>{COURIER_VEHICLE_NOTE}</Text>
            <Text style={s.h2}>Required Documents</Text><Bullets items={[...COURIER_DOCUMENTS.map((d) => d.label), "Signed Courier Driver Agreement"]} />
            <Text style={s.muted}>{COURIER_BANKING_NOTE}</Text>
            <Text style={s.h2}>Driver Responsibilities</Text><Bullets items={COURIER_DRIVER_RESPONSIBILITIES} />
            <Text style={s.h2}>How to Get Started</Text><Bullets items={COURIER_GET_STARTED.map((t, i) => `${i + 1}. ${t}`)} />
          </>
        )}

        {step === 1 && (
          <>
            {renderUpload("PROFILE_PHOTO")}
            <Label>* Date of birth (YYYY-MM-DD)</Label>
            <TextInput value={f.dob} onChangeText={set("dob")} placeholder="1990-05-21" placeholderTextColor="#9ca3af" style={s.input} keyboardType="numbers-and-punctuation" accessibilityLabel="Date of birth" />
            <Text style={s.muted}>You must be at least {COURIER_MIN_AGE}.</Text>
            <Label>* Driver&apos;s licence number</Label>
            <TextInput value={f.licenseNumber} onChangeText={set("licenseNumber")} style={s.input} autoCapitalize="characters" accessibilityLabel="Driver's licence number" />
            <Label>* Licence class</Label>
            <Chips options={[...COURIER_LICENSE_CLASSES]} value={f.licenseClass} onChange={set("licenseClass")} />
            <Label>* Year you were first licensed</Label>
            <TextInput value={f.licensedSince} onChangeText={set("licensedSince")} placeholder="e.g. 2015" placeholderTextColor="#9ca3af" style={s.input} keyboardType="number-pad" maxLength={4} accessibilityLabel="Year first licensed" />
            <Text style={s.muted}>At least {COURIER_MIN_YEARS_DRIVING} year of driving experience.</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.muted}>Clear photos or PDFs. Your documents are only seen by the Movo review team.</Text>
            {renderUpload("DRIVERS_LICENSE")}{renderUpload("BACKGROUND_CHECK")}{renderUpload("DRIVERS_ABSTRACT")}{renderUpload("WORK_ELIGIBILITY")}
          </>
        )}

        {step === 3 && (
          <>
            <Label>* Vehicle type</Label>
            <Chips options={[...COURIER_VEHICLE_TYPES]} value={f.vehicleType} onChange={set("vehicleType")} />
            <Label>* Make</Label>
            <TextInput value={f.vehicleMake} onChangeText={set("vehicleMake")} placeholder="e.g. Toyota" placeholderTextColor="#9ca3af" style={s.input} accessibilityLabel="Make" />
            <Label>* Model</Label>
            <TextInput value={f.vehicleModel} onChangeText={set("vehicleModel")} placeholder="e.g. RAV4" placeholderTextColor="#9ca3af" style={s.input} accessibilityLabel="Model" />
            <Label>* Year</Label>
            <TextInput value={f.vehicleYear} onChangeText={set("vehicleYear")} placeholder="e.g. 2019" placeholderTextColor="#9ca3af" style={s.input} keyboardType="number-pad" maxLength={4} accessibilityLabel="Vehicle year" />
            <Label>* Colour</Label>
            <Chips options={COLORS.map((c) => ({ id: c, label: c }))} value={f.vehicleColor} onChange={set("vehicleColor")} />
            <Label>* Licence plate</Label>
            <TextInput value={f.vehiclePlate} onChangeText={(v) => set("vehiclePlate")(v.toUpperCase())} placeholder="e.g. ABC 123" placeholderTextColor="#9ca3af" style={s.input} autoCapitalize="characters" accessibilityLabel="Licence plate" />
            {renderUpload("VEHICLE_REGISTRATION")}{renderUpload("VEHICLE_PHOTO")}
            <CheckRow on={insurance} onChange={setInsurance}>My vehicle is clean, roadworthy and suitable for transporting packages, and my insurance covers courier and delivery activities.</CheckRow>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={s.body}>As a Movo Courier driver, you will:</Text>
            <Bullets items={COURIER_DRIVER_RESPONSIBILITIES} />
            <CheckRow on={responsibilities} onChange={setResponsibilities}>I understand and will follow these responsibilities.</CheckRow>
          </>
        )}

        {step === 5 && (
          <>
            <AgreementText />
            <Label>* Type your full legal name to sign</Label>
            <TextInput value={f.signature} onChangeText={set("signature")} style={[s.input, { fontStyle: "italic" }]} autoCapitalize="words" accessibilityLabel="Signature (full legal name)" />
            <CheckRow on={signed} onChange={setSigned}>By typing my name above, I sign the Movo Courier Driver Agreement and confirm I have read and agree to it.</CheckRow>
            <CheckRow on={terms} onChange={setTerms}>I accept the Terms of Service.</CheckRow>
            <CheckRow on={privacy} onChange={setPrivacy}>I accept the Privacy Policy.</CheckRow>
            <Text style={s.link} onPress={() => openWeb("/terms")}>Read the Terms of Service</Text>
            <Text style={s.link} onPress={() => openWeb("/privacy-policy")}>Read the Privacy Policy</Text>
          </>
        )}

        {step === 6 && !submitted && (
          <>
            {[
              { l: "About you", ok: !!f.dob && !!f.licenseNumber && uploaded(["PROFILE_PHOTO"]) },
              { l: "Documents", ok: uploaded(["DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT", "WORK_ELIGIBILITY"]) },
              { l: "Vehicle", ok: uploaded(["VEHICLE_REGISTRATION", "VEHICLE_PHOTO"]) && insurance },
              { l: "Responsibilities", ok: responsibilities },
              { l: "Courier Driver Agreement signed", ok: signed && !!f.signature.trim() },
            ].map((r) => (
              <View key={r.l} style={s.reviewRow}>
                <Text style={s.body}>{r.l}</Text>
                <Text style={[s.body, { color: r.ok ? "#16a34a" : "#dc2626", fontFamily: fonts.bodySemi }]}>{r.ok ? "✓" : "Missing"}</Text>
              </View>
            ))}
            <Text style={s.muted}>{COURIER_BANKING_NOTE}</Text>
          </>
        )}

        {submitted && (
          <View style={{ alignItems: "center", gap: 10, paddingTop: 24 }}>
            <View style={s.done}><Icon name="check" size={34} color="#fff" strokeWidth={3} /></View>
            <Text style={s.title}>Application submitted</Text>
            <Text style={[s.body, { textAlign: "center" }]}>The Movo team will review your application and documents and email you with the decision.</Text>
            <View style={{ alignSelf: "stretch", marginTop: 8 }}><Bullets items={COURIER_GET_STARTED.slice(2)} /></View>
          </View>
        )}

        {error && <Text style={s.error}>{error}</Text>}
      </ScrollView>

      {!submitted && (
        <View style={s.footer}>
          <Pressable disabled={busy} onPress={step === 0 ? start : step === 6 ? submit : next} accessibilityRole="button"
            style={[s.cta, busy && { opacity: 0.6 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{step === 0 ? "Apply Now" : step === 6 ? "Submit application" : "Continue"}</Text>}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  headerLink: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#6b7280" },
  page: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  kicker: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#9ca3af", letterSpacing: 0.5 },
  title: { fontFamily: fonts.bodySemi, fontSize: 20, color: "#111827" },
  bar: { height: 6, borderRadius: 3, backgroundColor: "#f3f4f6", marginTop: 8, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.navy },
  hero: { backgroundColor: colors.navy, borderRadius: 20, padding: 20, gap: 6 },
  heroTitle: { fontFamily: fonts.bodySemi, fontSize: 22, color: "#fff" },
  h2: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#111827", marginTop: 10 },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#374151", lineHeight: 19 },
  muted: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", lineHeight: 16 },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#4b5563", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14, color: "#111827", backgroundColor: "#fafafa" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  upload: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#e5e7eb", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" },
  uploadLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  uploadSub: { fontFamily: fonts.body, fontSize: 11, color: "#9ca3af", marginTop: 2 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 12, backgroundColor: "#f9fafb" },
  link: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.navy },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", backgroundColor: "#fef2f2", padding: 10, borderRadius: 10 },
  done: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb" },
  cta: { backgroundColor: colors.navy, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#fff" },
});

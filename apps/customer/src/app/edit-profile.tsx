/**
 * Edit personal info — mirrors movo-web home/profile/personal-info/edit
 * (PATCH /api/user/profile; phone normalised to E.164 by the server).
 */
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, user as userApi } from "@movo/api";
import type { UserProfile } from "@movo/shared";
import { Button, Input, colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useSession } from "@/lib/session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditProfile() {
  const profile = useQuery({ queryKey: ["user-profile"], queryFn: userApi.profile });
  const p = profile.data?.user;
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Personal info" fallback="/profile" />
      {p ? <ProfileForm profile={p} />
        : profile.isError ? <Text style={[styles.error, { padding: 16 }]}>Couldn&apos;t load your details. Please try again.</Text>
        : <ActivityIndicator style={{ marginTop: 32 }} color={colors.navy} />}
    </SafeAreaView>
  );
}

function ProfileForm({ profile: p }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: p.firstName ?? "", lastName: p.lastName ?? "", email: p.email ?? "", phone: p.phone ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    if (!form.firstName.trim()) return setError("Please enter your first name.");
    if (form.email.trim() && !EMAIL.test(form.email.trim())) return setError("Please enter a valid email address.");
    setSaving(true);
    try {
      await userApi.updateProfile({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), phone: form.phone.trim(),
      });
      await qc.invalidateQueries({ queryKey: ["user-profile"] });
      await useSession.getState().refresh();
      Alert.alert("Saved", "Your details have been updated.");
      router.back();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Input label="First name" value={form.firstName} onChangeText={set("firstName")} autoComplete="given-name" textContentType="givenName" />
          <Input label="Last name" value={form.lastName} onChangeText={set("lastName")} autoComplete="family-name" textContentType="familyName" />
          <Input label="Email" value={form.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address"
            autoComplete="email" textContentType="emailAddress" />
          <Input label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad"
            autoComplete="tel" textContentType="telephoneNumber" placeholder="+1 204 555 0123" />
          <Text style={styles.hint}>Your chauffeur uses this number to reach you at pickup. Changing your email also changes how you sign in.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Save changes" onPress={save} loading={saving} disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.steel, lineHeight: 17 },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});

/**
 * Profile — mirrors movo-web driver/home/profile: photo (riders see it), name
 * and rating, vehicle, banking, safety reports, support, legal, account.
 */
import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, driver as driverApi } from "@movo/api";
import { Card, Icon, type IconName, colors, fontSizes, fonts, spacing } from "@movo/ui";
import { useSession } from "@/lib/session";
import { useShift } from "@/lib/shift";
import { emailSupport, openWeb } from "@/lib/links";

function Row({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const tint = danger ? colors.danger : colors.navy;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Icon name={icon} size={18} color={tint} />
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
      {!danger && <Icon name="chevronRight" size={16} color={colors.steel} />}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.section}>{title}</Text>
      <Card style={styles.list}>{children}</Card>
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

export default function Profile() {
  const { driver, signOut, clear } = useSession();
  const goOffline = useShift((s) => s.goOffline);
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const photo = useQuery({ queryKey: ["profile-photo"], queryFn: driverApi.profilePhoto });
  const ratings = useQuery({ queryKey: ["ratings"], queryFn: driverApi.ratings });
  const { refetch: refetchRatings } = ratings;
  useFocusEffect(useCallback(() => { refetchRatings(); }, [refetchRatings]));

  /* Square crop, compressed well under the server's 2 MB limit */
  const changePhoto = async () => {
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    const asset = pick.canceled ? null : pick.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      const type = asset.mimeType ?? "image/jpeg";
      const ext = type.split("/")[1] ?? "jpg";
      const { photoUrl } = await driverApi.uploadProfilePhoto({ uri: asset.uri, name: asset.fileName ?? `photo.${ext}`, type });
      queryClient.setQueryData(["profile-photo"], { photoUrl });
    } catch (e) {
      Alert.alert("Couldn't update your photo", e instanceof ApiError && e.status !== 0 ? e.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /* Required by the App Store and Google Play. The server refuses while a ride
     is active or earnings / payouts are pending, so no one loses money. */
  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "Your chauffeur account will be closed and you'll be signed out on every device. Completed ride and payout records are kept for accounting. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: deleteAccount },
      ],
    );

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await driverApi.deleteAccount();
      await goOffline();
      await clear();
    } catch (e) {
      Alert.alert("Couldn't delete your account", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const avg = ratings.data?.avgRating;
  const total = ratings.data?.totalReviews ?? 0;
  const recent = ratings.data?.reviews.slice(0, 3) ?? [];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Card style={styles.header}>
          <Pressable onPress={changePhoto} disabled={uploading} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <View style={styles.avatar}>
              {photo.data?.photoUrl
                ? <Image source={{ uri: photo.data.photoUrl }} style={styles.avatarImg} contentFit="cover" />
                : <Icon name="user" size={28} color={colors.steel} strokeWidth={1.5} />}
              {uploading && <View style={styles.avatarBusy}><ActivityIndicator color="#fff" /></View>}
            </View>
            <Text style={styles.photoLink}>{photo.data?.photoUrl ? "Change photo" : "Add photo"}</Text>
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{driver?.firstName} {driver?.lastName}</Text>
            <Text style={styles.email} numberOfLines={1}>{driver?.email}</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.rating}>
                {avg != null ? `${avg.toFixed(1)} · ${total} review${total === 1 ? "" : "s"}` : "No ratings yet"}
              </Text>
            </View>
          </View>
        </Card>
        {!photo.isPending && !photo.data?.photoUrl && (
          <Text style={styles.hint}>Add your photo — it helps riders recognise you at pickup.</Text>
        )}

        {recent.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.section}>Recent reviews</Text>
            {recent.map((r) => (
              <Card key={r.id} style={{ gap: 4 }}>
                <View style={styles.between}>
                  <Text style={styles.reviewer}>{r.clientName}</Text>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon key={s} name="star" size={12} strokeWidth={1.5}
                        color={s <= r.rating ? "#f59e0b" : "#d1d5db"} fill={s <= r.rating ? "#f59e0b" : "none"} />
                    ))}
                  </View>
                </View>
                {r.review ? <Text style={styles.review}>{r.review}</Text> : null}
              </Card>
            ))}
          </View>
        )}

        <Section title="Vehicle & payments">
          <Row icon="home" label="My vehicle" onPress={() => router.push("/vehicle")} />
          <Divider />
          <Row icon="wallet" label="Banking details" onPress={() => router.push("/banking")} />
        </Section>

        <Section title="Safety">
          <Row icon="alert" label="Report an incident" onPress={() => router.push("/report-incident")} />
          <Divider />
          <Row icon="list" label="Report a found item" onPress={() => router.push("/report-found-item")} />
        </Section>

        <Section title="Support & legal">
          <Row icon="mail" label="Contact support" onPress={() => emailSupport()} />
          <Divider />
          <Row icon="list" label="Terms of service" onPress={() => openWeb("/terms")} />
          <Divider />
          <Row icon="list" label="Privacy policy" onPress={() => openWeb("/privacy-policy")} />
        </Section>

        <Card style={styles.list}>
          <Row icon="logOut" label="Sign out" onPress={async () => { await goOffline(); await signOut(); }} />
          <Divider />
          <Row icon="trash" label={deleting ? "Deleting…" : "Delete account"} onPress={confirmDelete} danger />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 72, height: 72 },
  avatarBusy: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  photoLink: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.navy, textAlign: "center", marginTop: 6 },
  name: { fontFamily: fonts.headingSemi, fontSize: fontSizes.lg, color: colors.navy },
  email: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.muted },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  rating: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#374151" },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: -8, paddingHorizontal: 4 },
  section: { fontFamily: fonts.bodySemi, fontSize: 11, color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 4 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewer: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1f2937" },
  review: { fontFamily: fonts.body, fontSize: 12, color: "#6b7280", lineHeight: 17 },
  list: { paddingVertical: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.base },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

/**
 * Help — mirrors movo-web home/help: searchable topics and FAQs, then
 * "Contact support". Content lives in lib/helpTopics (copied from the web).
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Icon, colors, fonts } from "@movo/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { emailSupport } from "@/lib/links";
import { faqs, helpTopics } from "@/lib/helpTopics";

function Expandable({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ gap: 10 }}>
      <Pressable onPress={() => setOpen(!open)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        <Icon name="chevronRight" size={16} color={colors.steel} />
      </Pressable>
      {open ? <View style={{ gap: 10 }}>{children}</View> : null}
    </Card>
  );
}

export default function Help() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const has = (...t: string[]) => t.some((x) => x.toLowerCase().includes(q));
  const topics = useMemo(() => (!q ? helpTopics : helpTopics.filter((t) =>
    has(t.title, t.description) || t.sections.some((s) => has(s.heading, s.body)))), [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = useMemo(() => (!q ? faqs : faqs.filter((f) => has(f.question, f.answer))), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenHeader title="Help" fallback="/profile" />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <TextInput value={query} onChangeText={setQuery} placeholder="Search help" placeholderTextColor={colors.steel}
          style={styles.search} returnKeyType="search" clearButtonMode="while-editing" />

        {topics.length > 0 && <Text style={styles.section}>Topics</Text>}
        {topics.map((t) => (
          <Expandable key={t.id} title={t.title} subtitle={t.description}>
            {t.sections.map((s) => (
              <View key={s.heading} style={{ gap: 2 }}>
                <Text style={styles.heading}>{s.heading}</Text>
                <Text style={styles.body}>{s.body}</Text>
              </View>
            ))}
          </Expandable>
        ))}

        {questions.length > 0 && <Text style={styles.section}>Frequently asked questions</Text>}
        {questions.map((f) => (
          <Expandable key={f.question} title={f.question}>
            <Text style={styles.body}>{f.answer}</Text>
          </Expandable>
        ))}

        {!topics.length && !questions.length && <Text style={styles.sub}>No results for “{query}”.</Text>}

        <Card style={{ gap: 8, marginTop: 8 }}>
          <Text style={styles.title}>Still need help?</Text>
          <Text style={styles.sub}>Email Movo support and we&apos;ll get back to you as soon as we can. If you&apos;re in danger during a ride, call 911.</Text>
          <Button title="Contact support" onPress={() => emailSupport()} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10, paddingBottom: 40 },
  search: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: "#1F2937", backgroundColor: "#fff" },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.steel, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 6 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.navy },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.steel, lineHeight: 17, marginTop: 2 },
  heading: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#1F2937" },
  body: { fontFamily: fonts.body, fontSize: 13, color: "#4B5563", lineHeight: 19 },
});

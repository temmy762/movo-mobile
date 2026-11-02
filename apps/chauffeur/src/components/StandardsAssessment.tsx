/**
 * Onboarding step 5 — the Movo Chauffeur Standards Assessment. Mirrors
 * movo-web driver/onboarding/chauffeur/StandardsAssessment: questions,
 * grading and the attempt limit all come from the server; this only renders.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ApiError, onboarding as onboardingApi } from "@movo/api";
import { colors, fonts } from "@movo/ui";

type Assessment = onboardingApi.Assessment;
type AssessmentOption = onboardingApi.AssessmentOption;

const gradient = ["#1a1a2e", "#131936", "#C6BFB2"] as const;

function Primary({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  const off = disabled || busy;
  return (
    <Pressable onPress={onPress} disabled={off} style={{ flex: 1 }} accessibilityRole="button" accessibilityState={{ disabled: off }}>
      {off ? (
        <View style={[s.btn, { backgroundColor: "#d1d5db" }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{label}</Text>}
        </View>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
          <Text style={s.btnText}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function Secondary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, s.outline]} accessibilityRole="button">
      <Text style={[s.btnText, { color: "#374151" }]}>{label}</Text>
    </Pressable>
  );
}

export function StandardsAssessment({ onPassed, onBack, continuing, onScrollTop }: {
  onPassed: () => void; onBack: () => void; continuing: boolean; onScrollTop: () => void;
}) {
  const [data, setData] = useState<Assessment | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<"intro" | "quiz" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AssessmentOption>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = (a: Assessment) => {
    setData(a);
    setView(a.lastAttempt && a.status !== "NOT_STARTED" ? "result" : "intro");
  };

  useEffect(() => {
    onboardingApi.assessment().then(show).catch(() => setLoadError(true));
  }, []);

  const start = () => { setAnswers({}); setIndex(0); setError(null); setView("quiz"); onScrollTop(); };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      show(await onboardingApi.submitAssessment(answers));
      onScrollTop();
    } catch (e) {
      setError(e instanceof ApiError && e.status !== 0 ? e.message : "Couldn't submit the assessment. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <View style={{ gap: 4 }}>
      <Text style={s.title}>Standards Assessment</Text>
      <Text style={s.sub}>Answer {data?.totalQuestions ?? 10} questions about Movo service and safety standards.</Text>
    </View>
  );

  if (!data) {
    return (
      <>
        {header}
        {loadError
          ? <Text style={[s.sub, { textAlign: "center", paddingVertical: 32 }]}>Couldn&apos;t load the assessment. Go back and try again.</Text>
          : <ActivityIndicator color={colors.navy} style={{ paddingVertical: 32 }} />}
        <View style={s.nav}><Secondary label="← Back" onPress={onBack} /></View>
      </>
    );
  }

  /* ── Questions, one at a time ── */
  if (view === "quiz") {
    const q = data.questions[index];
    const last = index === data.questions.length - 1;
    const allAnswered = data.questions.every((x) => answers[String(x.id)]);
    const chosen = answers[String(q.id)];
    return (
      <>
        {header}
        <View style={s.qTop}>
          <Text style={s.qCount}>QUESTION {index + 1} OF {data.questions.length}</Text>
          {q.critical && <Text style={s.safety}>Safety question</Text>}
        </View>
        <View style={s.track}>
          <LinearGradient colors={["#131936", "#C6BFB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.bar, { width: `${((index + 1) / data.questions.length) * 100}%` }]} />
        </View>
        <Text style={s.question}>{q.question}</Text>
        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          {q.options.map((o) => {
            const on = chosen === o.key;
            return (
              <Pressable key={o.key} onPress={() => setAnswers((p) => ({ ...p, [String(q.id)]: o.key }))}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={[s.option, on && { borderColor: colors.navy, backgroundColor: "#f5f3ff" }]}>
                <View style={[s.letter, on && { backgroundColor: colors.navy }]}>
                  <Text style={[s.letterText, on && { color: "#fff" }]}>{o.key}</Text>
                </View>
                <Text style={s.optionText}>{o.text}</Text>
              </Pressable>
            );
          })}
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        <View style={s.nav}>
          <Secondary label="Previous" onPress={() => (index === 0 ? setView("intro") : setIndex(index - 1))} />
          {last
            ? <Primary label="Submit Assessment" onPress={submit} disabled={!allAnswered} busy={submitting} />
            : <Primary label="Next" onPress={() => setIndex(index + 1)} disabled={!chosen} />}
        </View>
        {last && !allAnswered && <Text style={[s.sub, { textAlign: "center", fontSize: 12 }]}>Answer every question to submit — use Previous to go back.</Text>}
      </>
    );
  }

  /* ── Score, corrections and what's next ── */
  if (view === "result" && data.lastAttempt) {
    const a = data.lastAttempt;
    const passed = data.status === "PASSED";
    const locked = data.status === "ADMIN_REVIEW";
    return (
      <>
        {header}
        <View style={[s.banner, passed ? s.bannerPass : s.bannerFail]}>
          <Text style={[s.bannerTitle, { color: passed ? "#166534" : "#991b1b" }]}>{passed ? "Assessment Passed" : "Assessment Not Passed"}</Text>
          <Text style={s.score}>{a.score}/{a.total}</Text>
          <Text style={s.bannerText}>
            {passed ? "You may continue onboarding."
              : locked ? "Your assessment requires admin review. Please contact Movo support."
              : "Review your answers and try again."}
          </Text>
          {!passed && a.criticalMissed.length > 0 && (
            <Text style={[s.bannerText, { color: "#b91c1c", fontFamily: fonts.bodySemi }]}>
              You missed {a.criticalMissed.length === 1 ? "a safety question" : "both safety questions"} (Q{a.criticalMissed.join(" and Q")}). Both must be correct to pass, whatever your score.
            </Text>
          )}
          {!passed && !locked && <Text style={s.bannerText}>{data.attemptsLeft} attempt{data.attemptsLeft === 1 ? "" : "s"} left.</Text>}
        </View>

        {a.results.map((r) => {
          const text = (k: AssessmentOption) => r.options.find((o) => o.key === k)?.text ?? k;
          return (
            <View key={r.id} style={[s.result, r.isCorrect ? s.resultOk : s.resultBad]}>
              <Text style={s.resultQ}>
                <Text style={{ color: r.isCorrect ? "#16a34a" : "#dc2626" }}>{r.isCorrect ? "✓ " : "✗ "}</Text>
                {r.id}. {r.question}{r.critical ? <Text style={s.safetyTag}>  SAFETY</Text> : null}
              </Text>
              <Text style={s.resultLine}>Your answer: {r.chosen}. {text(r.chosen)}</Text>
              {!r.isCorrect && <Text style={[s.resultLine, { color: "#15803d" }]}>Correct answer: {r.correct}. {text(r.correct)}</Text>}
              <Text style={s.explain}>{r.explanation}</Text>
            </View>
          );
        })}

        {locked && (
          <Text style={[s.sub, { textAlign: "center" }]}>
            Contact <Text style={s.link} onPress={() => Linking.openURL("mailto:support@movoprive.com")}>support@movoprive.com</Text> to arrange another attempt.
          </Text>
        )}
        <View style={s.nav}>
          <Secondary label="← Back" onPress={onBack} />
          {!locked && (passed
            ? <Primary label="Continue →" onPress={onPassed} busy={continuing} />
            : <Primary label="Try Again" onPress={start} />)}
        </View>
      </>
    );
  }

  /* ── Before starting ── */
  return (
    <>
      {header}
      <View style={s.info}>
        <Text style={s.infoTitle}>Before starting</Text>
        <Text style={s.infoText}>
          You need {Math.round((data.passScore / data.totalQuestions) * 100)}% and must answer both safety questions correctly. You have {data.maxAttempts} attempts.
        </Text>
        {data.attemptsUsed > 0 && <Text style={s.infoText}>{data.attemptsLeft} of {data.maxAttempts} attempts left.</Text>}
      </View>
      <View style={s.nav}>
        <Secondary label="← Back" onPress={onBack} />
        <Primary label="Start Assessment" onPress={start} />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.heading, fontSize: 20, color: "#111827" },
  sub: { fontFamily: fonts.body, fontSize: 13, color: "#6b7280", lineHeight: 19 },
  nav: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  outline: { borderWidth: 1, borderColor: "#d1d5db", minWidth: 110 },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 15, color: "#fff" },
  qTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qCount: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, color: "#9ca3af" },
  safety: { fontFamily: fonts.bodySemi, fontSize: 10, color: "#b91c1c", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  track: { height: 4, borderRadius: 2, backgroundColor: "#f3f4f6", overflow: "hidden", marginTop: -6 },
  bar: { height: 4, borderRadius: 2 },
  question: { fontFamily: fonts.heading, fontSize: 16, color: "#111827", lineHeight: 22 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  letter: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  letterText: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#6b7280" },
  optionText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: "#1f2937", lineHeight: 19 },
  error: { fontFamily: fonts.body, fontSize: 12, color: "#dc2626", textAlign: "center" },
  banner: { borderRadius: 16, padding: 18, alignItems: "center", gap: 6, borderWidth: 1 },
  bannerPass: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  bannerFail: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  bannerTitle: { fontFamily: fonts.heading, fontSize: 16 },
  score: { fontFamily: fonts.heading, fontSize: 30, color: "#111827" },
  bannerText: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563", textAlign: "center", lineHeight: 19 },
  result: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  resultOk: { borderColor: "#bbf7d0", backgroundColor: "#f7fef9" },
  resultBad: { borderColor: "#fecaca", backgroundColor: "#fffafa" },
  resultQ: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#111827", lineHeight: 19 },
  safetyTag: { fontFamily: fonts.bodySemi, fontSize: 10, color: "#b91c1c" },
  resultLine: { fontFamily: fonts.body, fontSize: 12, color: "#4b5563" },
  explain: { fontFamily: fonts.body, fontSize: 11, color: "#6b7280", lineHeight: 16 },
  info: { padding: 16, borderRadius: 14, backgroundColor: "#f8f7f4", gap: 8 },
  infoTitle: { fontFamily: fonts.heading, fontSize: 14, color: colors.navy },
  infoText: { fontFamily: fonts.body, fontSize: 13, color: "#4b5563", lineHeight: 19 },
  link: { fontFamily: fonts.bodySemi, color: colors.navy, textDecorationLine: "underline" },
});

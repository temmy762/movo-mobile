import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fontSizes, fonts, spacing } from "../tokens";

type Props = TextInputProps & { label?: string; error?: string | null; right?: ReactNode };

/* Same as the web forms: small label inside a bordered box (rounded-lg, gray-300) */
export function Input({ label, error, right, style, ...rest }: Props) {
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.box, !!error && { borderColor: colors.danger }]}>
        <View style={{ flex: 1 }}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          <TextInput placeholderTextColor={colors.steel} style={[styles.input, style]} {...rest} />
        </View>
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB", // tailwind gray-300
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  label: { fontSize: 11, fontFamily: fonts.body, color: "#9CA3AF" },
  input: { paddingVertical: 2, fontSize: fontSizes.base, fontFamily: fonts.body, color: "#1F2937" },
  error: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.danger },
});

import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, fontSizes, fonts, radii, spacing } from "../tokens";

type Props = TextInputProps & { label?: string; error?: string | null };

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.steel}
        style={[styles.input, !!error && { borderColor: colors.danger }, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSizes.sm, fontFamily: fonts.bodySemi, color: colors.navy },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.foreground,
  },
  error: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.danger },
});

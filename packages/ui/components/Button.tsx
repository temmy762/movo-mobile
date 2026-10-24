import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fontSizes, fonts, gradients, radii } from "../tokens";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: Props) {
  const inactive = disabled || loading;
  const label = loading
    ? <ActivityIndicator color={variant === "secondary" ? colors.navy : colors.white} />
    : <Text style={[styles.text, variant === "secondary" && { color: colors.navy }]}>{title}</Text>;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, { opacity: inactive ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {variant === "primary" ? (
        <LinearGradient {...gradients.cta} style={styles.fill}>{label}</LinearGradient>
      ) : (
        <View style={[styles.fill, variant === "secondary" ? styles.secondary : styles.danger]}>{label}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.xl, overflow: "hidden" },
  fill: { minHeight: 48, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl },
  danger: { backgroundColor: colors.danger },
  text: { color: colors.white, fontSize: fontSizes.base, fontFamily: fonts.bodySemi },
});

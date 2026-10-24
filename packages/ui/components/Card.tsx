import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radii, spacing } from "../tokens";

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});

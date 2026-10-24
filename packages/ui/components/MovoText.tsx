import { Text, type TextProps } from "react-native";
import { colors, fontSizes, fonts } from "../tokens";

const variants = {
  title: { fontFamily: fonts.heading, fontSize: fontSizes["2xl"], color: colors.navy },
  heading: { fontFamily: fonts.headingSemi, fontSize: fontSizes.xl, color: colors.navy },
  body: { fontFamily: fonts.body, fontSize: fontSizes.base, color: colors.foreground },
  caption: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.muted },
} as const;

export function MovoText({ variant = "body", style, ...rest }: TextProps & { variant?: keyof typeof variants }) {
  return <Text style={[variants[variant], style]} {...rest} />;
}

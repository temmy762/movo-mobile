/* Design tokens — mirror movo-web app/globals.css (--mp-*) and the Tailwind
   values used across the web screens. Change both together. */

export const colors = {
  navy: "#131936",
  black: "#0A0A0F",
  slate: "#2A3055",
  ivory: "#F5F5F2",
  steel: "#8A8F9E",
  taupe: "#C6BFB2",
  deep: "#1a1a2e",
  white: "#FFFFFF",
  background: "#F5F5F2",
  foreground: "#0A0A0F",
  muted: "#6B7280",   // tailwind gray-500
  border: "#E5E7EB",  // tailwind gray-200
  danger: "#EF4444",  // tailwind red-500
} as const;

/* expo-linear-gradient props for the web's CSS gradients */
export const gradients = {
  /* --mp-gradient-cta: 135deg */
  cta: { colors: ["#0A0A0F", "#131936", "#2A3055"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /* --mp-gradient-silver: 135deg */
  silver: { colors: ["#8A8F9E", "#C6BFB2", "#F5F5F2"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /* Brand bar: linear-gradient(90deg, #1a1a2e, #131936, #C6BFB2) */
  brand: { colors: ["#1a1a2e", "#131936", "#C6BFB2"], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
} as const;

/* Tailwind radii used on the web: rounded-xl, rounded-2xl, rounded-3xl, rounded-full */
export const radii = { xl: 12, "2xl": 16, "3xl": 24, full: 9999 } as const;

/* The web uses explicit pixel sizes (text-[12px] … text-[18px]) */
export const fontSizes = { xs: 10, sm: 12, md: 13, base: 14, lg: 16, xl: 18, "2xl": 22, "3xl": 28 } as const;

/* Inter for headings, DM Sans for body — loaded via @expo-google-fonts in each app */
export const fonts = {
  heading: "Inter_700Bold",
  headingSemi: "Inter_600SemiBold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24 } as const;

/* Booking status colours (driver my-rides StatusBadge on the web) */
export const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#fef9c3", color: "#854d0e", label: "Awaiting Acceptance" },
  CONFIRMED: { bg: "#dbeafe", color: "#1e40af", label: "Confirmed" },
  COMPLETED: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
};

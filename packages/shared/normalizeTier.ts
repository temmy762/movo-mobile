/* AUTO-SYNCED from movo-web/lib/normalizeTier.ts by scripts/sync-shared.mjs — do not edit here. */

export type PlatformTier = "classic" | "premium" | "black" | "care";

const MAP: Record<string, PlatformTier> = {
  economy:                         "classic",
  "economy (movo classic)":        "classic",
  "business class":                "classic",
  business:                        "premium",
  "business van":                  "premium",
  "premium (movo premium)":        "premium",
  van:                             "premium",
  "first class":                   "black",
  "first class (movo privé black)":"black",
  "first class (movo prive black)":"black",
  firstclass:                      "black",
  luxury:                          "black",
  classic:                         "classic",
  premium:                         "premium",
  black:                           "black",
  /* 2026 display renames: Standard / Executive / Concierge */
  standard:                        "classic",
  "economy (standard)":            "classic",
  executive:                       "premium",
  "premium (executive)":           "premium",
  concierge:                       "black",
  "first class (concierge)":       "black",
  /* Movo Safe Ride (Care Ride) — its own pricing tier, independent of vehicle tiers */
  care:                            "care",
  "safe ride":                     "care",
  "movo safe ride":                "care",
  "movo care ride":                "care",
  saferide:                        "care",
};

export function normalizeTier(raw: string | null | undefined): PlatformTier {
  if (!raw) return "classic";
  const key = raw.trim().toLowerCase();
  return MAP[key] ?? "classic";
}

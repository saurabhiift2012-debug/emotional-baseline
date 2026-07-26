// ---------------------------------------------------------------------------
// ADMIN-CONFIGURABLE psychologist profiles.
//
// These enrich the psychologist records returned by the backend with the
// human details the "Book a call" screen needs: a real photo, a credential /
// title, a registration/licence line and (optionally) a one-line bio.
//
// RULES (do not break):
//  • Entries here are ADMIN-SUPPLIED. Replace the samples below with your own
//    real, licensed staff — real names, real photos, real licence numbers.
//  • Nothing is auto-generated. If a field is missing for a profile, the UI
//    HIDES that field — it never invents a placeholder person or fake data.
//  • Keyed by the backend psychologist `slug`.
// ---------------------------------------------------------------------------

export type PsychologistProfile = {
  photo?: string;       // real image URL (headshot)
  credential?: string;  // e.g. "Clinical Psychologist"
  licence?: string;     // e.g. "Registered Clinical Psychologist, RCI"
  bio?: string;         // one-line bio (overrides the backend bio when set)
};

export const PSYCHOLOGIST_PROFILES: Record<string, PsychologistProfile> = {
  "ruchi-sharma": {
    credential: "Clinical Psychologist",
    licence: "Registered Clinical Psychologist, RCI",
    bio: "Evidence-based support for anxiety, stress, relationships, children & post partum.",
  },
};

export function profileFor(slug?: string | null): PsychologistProfile {
  if (!slug) return {};
  return PSYCHOLOGIST_PROFILES[slug] || {};
}

// A scheduling-based availability signal derived from the real upcoming slots.
// Never says "available now / instantly".
export function availabilitySignal(
  slots: Array<{ label: string }> | undefined | null,
  t: (k: string) => string
): { text: string; hasSlot: boolean } {
  if (!slots || slots.length === 0) return { text: t("schedule_callback"), hasSlot: false };
  return { text: `${t("next_available")}: ${slots[0].label}`, hasSlot: true };
}

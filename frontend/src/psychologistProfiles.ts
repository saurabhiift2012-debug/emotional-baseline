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
  "ananya-rao": {
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
    credential: "Clinical Psychologist",
    licence: "Registered Clinical Psychologist, RCI",
    bio: "Warm, evidence-based support for anxiety, stress and sleep.",
  },
  "vikram-menon": {
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    credential: "Clinical Psychologist",
    licence: "Registered Clinical Psychologist, RCI",
    bio: "Helps people navigate relationships, burnout and work stress.",
  },
  "sara-iyer": {
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    credential: "Counselling Psychologist",
    licence: "Registered Psychologist, RCI",
    bio: "A gentle, collaborative approach for self-esteem and life changes.",
  },
  "rohit-kulkarni": {
    photo: "https://randomuser.me/api/portraits/men/75.jpg",
    credential: "Clinical Psychologist",
    licence: "Registered Clinical Psychologist, RCI",
    bio: "Focuses on mindfulness and sleep for everyday stress.",
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

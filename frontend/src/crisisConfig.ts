// Region-based crisis resources. Add new regions here later.
export type CrisisResource = { name: string; number: string; note?: string };
export type CrisisRegion = { code: string; label: string; resources: CrisisResource[] };

export const CRISIS_REGIONS: Record<string, CrisisRegion> = {
  IN: {
    code: "IN",
    label: "India",
    resources: [
      { name: "Tele-MANAS", number: "14416", note: "24x7, free" },
      { name: "Emergency", number: "112" },
    ],
  },
};

export const DEFAULT_REGION = "IN";

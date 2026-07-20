// Deterministic color palette — picks a color based on project ID so it's
// always the same color for the same project without manual wiring.

const PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: "#1d4ed8", text: "#bfdbfe", border: "#3b82f6" }, // blue
  { bg: "#ea580c", text: "#fed7aa", border: "#f97316" }, // orange
  { bg: "#be185d", text: "#fbcfe8", border: "#ec4899" }, // pink
  { bg: "#b45309", text: "#fde68a", border: "#f59e0b" }, // amber
  { bg: "#6d28d9", text: "#ddd6fe", border: "#a78bfa" }, // violet
  { bg: "#0f766e", text: "#99f6e4", border: "#14b8a6" }, // teal
  { bg: "#166534", text: "#bbf7d0", border: "#22c55e" }, // green
  { bg: "#be123c", text: "#fecdd3", border: "#f43f5e" }, // rose
  { bg: "#1e40af", text: "#bfdbfe", border: "#60a5fa" }, // indigo
  { bg: "#92400e", text: "#fde68a", border: "#d97706" }, // dark amber
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function projectColor(id: string) {
  return PALETTE[hashId(id) % PALETTE.length];
}

// Explicit client color map — keyed by first word of client name (lowercase)
const CLIENT_MAP: Record<string, { bg: string; text: string; border: string }> = {
  cambria:  { bg: "#78350f", text: "#fde68a", border: "#d97706" }, // amber
  erm:      { bg: "#134e4a", text: "#99f6e4", border: "#0d9488" }, // teal
  slr:      { bg: "#3b0764", text: "#e9d5ff", border: "#7c3aed" }, // violet
  mctavish: { bg: "#1e3a8a", text: "#bfdbfe", border: "#2563eb" }, // blue
  internal: { bg: "#1e293b", text: "#94a3b8", border: "#475569" }, // slate
};

// Color by client — normalizes to first word so "ERM Sustainability" and "ERM" get the same color
export function clientColor(client: string) {
  const key = (client || "").trim().split(/[\s/,(]+/)[0].toLowerCase();
  return CLIENT_MAP[key] ?? PALETTE[hashId(key) % PALETTE.length];
}

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

export const LIGHT = {
  bg: "#f8fafc", surface: "#ffffff", surface2: "#f1f5f9",
  border: "rgba(0,0,0,0.07)", borderLight: "rgba(0,0,0,0.12)",
  primary: "#2563EB", accent: "#F97316",
  success: "#16a34a", danger: "#dc2626", warning: "#d97706",
  text: "#0f172a", muted: "#64748b",
  font: "Outfit,sans-serif", heading: "Outfit,sans-serif",
};

export const DARK = {
  bg: "#0f1117", surface: "#1a1c25", surface2: "#232630",
  border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.12)",
  primary: "#60a5fa", accent: "#fb923c",
  success: "#4ade80", danger: "#f87171", warning: "#fbbf24",
  text: "#e8e9ed", muted: "#8b8fa3",
  font: "Outfit,sans-serif", heading: "Outfit,sans-serif",
};

export type Theme = typeof LIGHT;

export function fmt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " \u20ac";
}

export function getAuthHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("budget_token") : null;
  return { "Content-Type": "application/json", ...(t ? { "x-user-token": t } : {}) };
}


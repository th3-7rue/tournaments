export const SPORT_OPTIONS = [
  "FOOTBALL",
  "BASKETBALL",
  "VOLLEYBALL",
  "BEACH_VOLLEY",
  "TENNIS",
  "PADEL",
  "CUSTOM",
] as const;

export type Sport = (typeof SPORT_OPTIONS)[number];

export const SPORT_DISPLAY_NAMES: Record<Sport, string> = {
  FOOTBALL: "⚽ Calcio / Calcetto",
  BASKETBALL: "🏀 Basket",
  VOLLEYBALL: "🏐 Pallavolo",
  BEACH_VOLLEY: "🏖️ Beach Volley",
  TENNIS: "🎾 Tennis",
  PADEL: "🏓 Padel",
  CUSTOM: "Custom",
};

export const VOLLEYBALL_SPORTS = ["VOLLEYBALL", "BEACH_VOLLEY"] as const;

export type VolleyballSport = (typeof VOLLEYBALL_SPORTS)[number];

export function isVolleyballSport(sport: string): sport is VolleyballSport {
  return sport === "VOLLEYBALL" || sport === "BEACH_VOLLEY";
}

/**
 * src/lib/scoring.ts
 * Logica di scoring pura e testabile per tutti gli sport.
 * Nessuna dipendenza da Prisma, React o Next.js.
 */

import type { Sport } from "@/lib/sports";

export type { Sport } from "@/lib/sports";

export interface SetScore {
  home: number;
  away: number;
}

export interface LiveMatchState {
  matchId: string;
  tournamentId: string;
  sport: Sport;
  homeName: string;
  awayName: string;
  // Punteggio nel set/periodo corrente
  homeCurrentPoints: number;
  awayCurrentPoints: number;
  // Set/periodi completati
  completedSets: SetScore[];
  // Numero del set/periodo corrente (1-indexed)
  currentSet: number;
  // Set (o partite) vinti
  homeSetsWon: number;
  awaySetsWon: number;
  // Massimo set configurati per il torneo
  maxSets: number;
  // Stato
  status: "LIVE" | "FINISHED";
}

// --- VOLLEY ---

/**
 * Controlla se il set di pallavolo corrente è finito.
 * Regole FIVB: vince chi arriva a 25 (15 nell'ultimo set) con 2 punti di vantaggio.
 */
export function shouldEndVolleyballSet(
  homePoints: number,
  awayPoints: number,
  setNumber: number, // 1-indexed (es. set 5 di 5 = deciding set)
  maxSets: number, // 3 o 5
): boolean {
  const isDecidingSet = setNumber === maxSets;
  const targetPoints = isDecidingSet ? 15 : 25;
  const leader = Math.max(homePoints, awayPoints);
  const trailer = Math.min(homePoints, awayPoints);
  return leader >= targetPoints && leader - trailer >= 2;
}

/**
 * Calcola i set vinti da ogni squadra dato l'array dei set completati.
 */
export function calculateSetsWon(completedSets: SetScore[]): {
  home: number;
  away: number;
} {
  return completedSets.reduce(
    (acc, set) => ({
      home: acc.home + (set.home > set.away ? 1 : 0),
      away: acc.away + (set.away > set.home ? 1 : 0),
    }),
    { home: 0, away: 0 },
  );
}

/**
 * Controlla se la partita di pallavolo è finita.
 */
export function isVolleyballMatchOver(
  completedSets: SetScore[],
  maxSets: number,
): boolean {
  const setsToWin = Math.ceil(maxSets / 2);
  const { home, away } = calculateSetsWon(completedSets);
  return home >= setsToWin || away >= setsToWin;
}

// --- TENNIS / PADEL ---

/**
 * Tennis/Padel: un set finisce a 6 giochi, con 2 di vantaggio.
 * Se si arriva a 6-6 entra il tiebreak (si va a 7).
 */
export function shouldEndTennisSet(
  homeGames: number,
  awayGames: number,
): boolean {
  const leader = Math.max(homeGames, awayGames);
  const trailer = Math.min(homeGames, awayGames);
  // Tiebreak: 7-6 è sufficiente
  if (leader >= 7 && leader - trailer >= 1) return true;
  // Normale: 6-x con 2 di vantaggio (e x <= 4)
  if (leader >= 6 && leader - trailer >= 2) return true;
  return false;
}

// --- CONFIGURAZIONI SPORT ---

export interface ScorerConfig {
  /** Sport con set/periodi multipli (volley, tennis) vs sport a punteggio unico (calcio) */
  hasSets: boolean;
  /** Punti/giochi target per vincere un set (0 se hasSets=false) */
  setTarget: (setNumber: number, maxSets?: number) => number;
  /** Set necessari per vincere la partita */
  setsToWin: (maxSets: number) => number;
  /** Etichetta del punto (es. "Gol", "Punti", "Giochi") */
  pointLabel: string;
  /** Etichetta del set (es. "Set", "Gioco") */
  setLabel: string;
  /** Controlla se il set corrente è finito */
  shouldEndSet: (
    home: number,
    away: number,
    setNumber: number,
    maxSets: number,
  ) => boolean;
  /** Controlla se la partita è finita */
  isMatchOver: (completedSets: SetScore[], maxSets: number) => boolean;
}

export const SPORT_CONFIGS: Record<Sport, ScorerConfig> = {
  VOLLEYBALL: {
    hasSets: true,
    setTarget: (setNumber, maxSets = 5) => (setNumber === maxSets ? 15 : 25),
    setsToWin: (maxSets) => Math.ceil(maxSets / 2),
    pointLabel: "Punti",
    setLabel: "Set",
    shouldEndSet: shouldEndVolleyballSet,
    isMatchOver: isVolleyballMatchOver,
  },
  BEACH_VOLLEY: {
    hasSets: true,
    setTarget: (setNumber, maxSets = 5) => (setNumber === maxSets ? 15 : 25),
    setsToWin: (maxSets) => Math.ceil(maxSets / 2),
    pointLabel: "Punti",
    setLabel: "Set",
    shouldEndSet: shouldEndVolleyballSet,
    isMatchOver: isVolleyballMatchOver,
  },
  TENNIS: {
    hasSets: true,
    setTarget: () => 6,
    setsToWin: (maxSets) => Math.ceil(maxSets / 2),
    pointLabel: "Giochi",
    setLabel: "Set",
    shouldEndSet: (home, away) => shouldEndTennisSet(home, away),
    isMatchOver: (completedSets, maxSets) =>
      isVolleyballMatchOver(completedSets, maxSets),
  },
  PADEL: {
    hasSets: true,
    setTarget: () => 6,
    setsToWin: () => 2,
    pointLabel: "Giochi",
    setLabel: "Set",
    shouldEndSet: (home, away) => shouldEndTennisSet(home, away),
    isMatchOver: (completedSets) => isVolleyballMatchOver(completedSets, 3),
  },
  FOOTBALL: {
    hasSets: false,
    setTarget: () => 0,
    setsToWin: () => 0,
    pointLabel: "Gol",
    setLabel: "",
    shouldEndSet: () => false,
    isMatchOver: () => false,
  },
  BASKETBALL: {
    hasSets: false,
    setTarget: () => 0,
    setsToWin: () => 0,
    pointLabel: "Punti",
    setLabel: "",
    shouldEndSet: () => false,
    isMatchOver: () => false,
  },
  CUSTOM: {
    hasSets: false,
    setTarget: () => 0,
    setsToWin: () => 0,
    pointLabel: "Punti",
    setLabel: "",
    shouldEndSet: () => false,
    isMatchOver: () => false,
  },
};

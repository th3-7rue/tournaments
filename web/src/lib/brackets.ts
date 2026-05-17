/**
 * Bracket generation utilities for Single Elimination, Double Elimination, and Champions League formats.
 */

interface MatchInput {
  id: string;
  name: string;
}
type MatchPair = [MatchInput, MatchInput];

interface BracketMatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName?: string;
  awayTeamName?: string;
  stage: string;
  round: number;
}

/**
 * Rounds a number to the nearest power of 2 (minimum 2).
 */
function roundToPowerOf2(n: number): number {
  if (n < 2) return 2;
  const log = Math.floor(Math.log2(n));
  const lower = Math.pow(2, log);
  const upper = Math.pow(2, log + 1);
  return n - lower < upper - n ? lower : upper;
}

/**
 * Generates the standard Round Robin schedule using the Berger algorithm.
 * Returns an array of rounds, each round being an array of [home, away] team pairs.
 */
export function generateRoundRobin(
  teams: MatchInput[],
  doubleRound = false,
): MatchPair[][] {
  const teamIds = teams.map((t) => t.id);
  const n = teamIds.length;

  if (n < 2) return [];

  // Make even number by adding a "BYE" placeholder
  if (n % 2 !== 0) {
    teamIds.push("BYE");
  }

  const numTeams = teamIds.length;
  const rounds = numTeams - 1;
  const half = numTeams / 2;
  const schedule: MatchPair[][] = [];

  // Fixed position algorithm (Berger)
  const positions = teamIds.map((id, i) => i);

  for (let round = 0; round < rounds; round++) {
    const matchRound: MatchPair[] = [];

    for (let match = 0; match < half; match++) {
      const homeIdx = positions[match];
      const awayIdx = positions[numTeams - 1 - match];

      const homeTeam = teams.find((t) => t.id === teamIds[homeIdx]);
      const awayTeam = teams.find((t) => t.id === teamIds[awayIdx]);

      if (homeTeam && awayTeam && homeTeam.id !== "BYE" && awayTeam.id !== "BYE") {
        matchRound.push([homeTeam, awayTeam] as MatchPair);
      }
    }

    // Rotate positions (fix position 0, rotate the rest)
    const last = positions.pop()!;
    positions.splice(1, 0, last);

    schedule.push(matchRound);
  }

  if (doubleRound) {
    // Return legs
    const returnLegs = schedule.map((round) =>
      round.map(([home, away]) => [away, home] as MatchPair),
    );
    return [...schedule, ...returnLegs];
  }

  return schedule;
}

/**
 * Generates a Single Elimination bracket.
 * Handles non-power-of-2 team counts with BYEs.
 *
 * @returns Array of rounds (each round is an array of matches)
 */
export function generateSingleElimination(
  teams: MatchInput[],
): { rounds: BracketMatch[][]; totalRounds: number; byeMatches: number } {
  const n = teams.length;
  if (n < 2) return { rounds: [], totalRounds: 0, byeMatches: 0 };

  const bracketSize = roundToPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);
  const byeMatches = bracketSize - n;

  // Generate bracket positions (standard seeding)
  const positions = generateSeededPositions(bracketSize);

  // First round matches
  const firstRound: BracketMatch[] = [];
  let byeCount = 0;

  for (let i = 0; i < bracketSize; i += 2) {
    const homePos = positions[i];
    const awayPos = positions[i + 1];
    const homeTeam = teams[homePos];
    const awayTeam = teams[awayPos];

    // Check for BYE (when one position is out of range)
    const isBye = !homeTeam || !awayTeam;
    if (isBye) byeCount++;

    firstRound.push({
      homeTeamId: homeTeam?.id ?? null,
      awayTeamId: awayTeam?.id ?? null,
      homeTeamName: homeTeam?.name,
      awayTeamName: awayTeam?.name,
      stage: "ROUND_OF_32", // Will be updated below
      round: 1,
    });
  }

  // Build subsequent rounds (empty slots that will be filled as matches progress)
  const allRounds: BracketMatch[][] = [firstRound];
  let currentRoundSize = firstRound.length;

  for (let round = 2; round <= totalRounds; round++) {
    currentRoundSize = currentRoundSize / 2;
    const roundMatches: BracketMatch[] = [];

    for (let i = 0; i < currentRoundSize; i++) {
      roundMatches.push({
        homeTeamId: null,
        awayTeamId: null,
        stage: getStageForRound(round, totalRounds),
        round,
      });
    }

    allRounds.push(roundMatches);
  }

  // Set nextMatchId links for bracket progression
  for (let round = 0; round < allRounds.length - 1; round++) {
    const currentRound = allRounds[round];
    const nextRound = allRounds[round + 1];

    for (let i = 0; i < currentRound.length; i += 2) {
      const nextMatchIndex = Math.floor(i / 2);
      if (nextMatchIndex < nextRound.length) {
        nextRound[nextMatchIndex].stage = getStageForRound(round + 2, totalRounds);
      }
    }
  }

  return { rounds: allRounds, totalRounds, byeMatches };
}

/**
 * Generates a Double Elimination bracket with Winner and Loser brackets.
 */
export function generateDoubleElimination(
  teams: MatchInput[],
): {
  winnerRounds: BracketMatch[][];
  loserRounds: BracketMatch[][];
  grandFinalMatch: BracketMatch;
} {
  const n = teams.length;
  if (n < 2) {
    return { winnerRounds: [], loserRounds: [], grandFinalMatch: { homeTeamId: null, awayTeamId: null, stage: "FINAL", round: 0 } };
  }

  const bracketSize = roundToPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);

  // --- Winner Bracket ---
  const winnerFirstRound: BracketMatch[] = [];
  const positions = generateSeededPositions(bracketSize);

  for (let i = 0; i < bracketSize; i += 2) {
    const homeTeam = teams[positions[i]];
    const awayTeam = teams[positions[i + 1]];
    winnerFirstRound.push({
      homeTeamId: homeTeam?.id ?? null,
      awayTeamId: awayTeam?.id ?? null,
      homeTeamName: homeTeam?.name,
      awayTeamName: awayTeam?.name,
      stage: "ROUND_OF_32",
      round: 1,
    });
  }

  const winnerRounds: BracketMatch[][] = [winnerFirstRound];
  let currentSize = winnerFirstRound.length;

  for (let round = 2; round <= totalRounds; round++) {
    currentSize = currentSize / 2;
    const roundMatches: BracketMatch[] = [];
    for (let i = 0; i < currentSize; i++) {
      roundMatches.push({
        homeTeamId: null,
        awayTeamId: null,
        stage: getStageForRound(round, totalRounds),
        round,
      });
    }
    winnerRounds.push(roundMatches);
  }

  // --- Loser Bracket ---
  // Loser bracket has (totalRounds * 2) - 1 rounds
  // Structure: pairs of rounds where loser bracket losers play, then winners advance
  const loserRounds: BracketMatch[][] = [];
  let loserRoundSize = winnerFirstRound.length;

  for (let wbRound = 1; wbRound < totalRounds; wbRound++) {
    // Round where WL winners play
    loserRoundSize = loserRoundSize / 2;
    const lbRound: BracketMatch[] = [];
    for (let i = 0; i < loserRoundSize; i++) {
      lbRound.push({
        homeTeamId: null,
        awayTeamId: null,
        stage: "GROUP_STAGE",
        round: loserRounds.length + 1,
      });
    }
    loserRounds.push(lbRound);

    // Round where WL losers play (if more than one round remains)
    if (loserRoundSize > 1 && wbRound < totalRounds - 1) {
      loserRoundSize = loserRoundSize / 2;
      const lbRound2: BracketMatch[] = [];
      for (let i = 0; i < loserRoundSize; i++) {
        lbRound2.push({
          homeTeamId: null,
          awayTeamId: null,
          stage: "GROUP_STAGE",
          round: loserRounds.length + 1,
        });
      }
      loserRounds.push(lbRound2);
    }
  }

  // --- Grand Final ---
  const grandFinalMatch: BracketMatch = {
    homeTeamId: null,
    awayTeamId: null,
    stage: "FINAL",
    round: totalRounds + 1,
  };

  return { winnerRounds, loserRounds, grandFinalMatch };
}

/**
 * Generates a Champions League format: groups + single elimination knockout.
 * Assumes 4 groups of 4 teams each (32 teams max).
 * For smaller tournaments, adapts proportionally.
 */
export function generateChampionsLeague(
  teams: MatchInput[],
  volleyballSets = 5,
): {
  groups: { name: string; teamIds: string[] }[];
  groupMatches: { groupName: string; matches: BracketMatch[] }[];
  knockoutRounds: BracketMatch[][];
} {
  const n = teams.length;
  if (n < 2) {
    return { groups: [], groupMatches: [], knockoutRounds: [] };
  }

  // Determine number of groups (min 2, max 8)
  const numGroups = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n))));
  const teamsPerGroup = Math.ceil(n / numGroups);

  const groups: { name: string; teamIds: string[] }[] = [];
  const groupMatches: { groupName: string; matches: BracketMatch[] }[] = [];

  for (let g = 0; g < numGroups; g++) {
    const groupName = `Girone ${String.fromCharCode(65 + g)}`; // A, B, C, ...
    const groupTeams: MatchInput[] = teams.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);

    groups.push({
      name: groupName,
      teamIds: groupTeams.map((t) => t.id),
    });

    // Round robin within each group
    const roundRobin = generateRoundRobin(groupTeams, true); // Double round robin
    const matches: BracketMatch[] = [];

    for (const round of roundRobin) {
      for (const [home, away] of round as [MatchInput, MatchInput][]) {
        matches.push({
          homeTeamId: home.id,
          awayTeamId: away.id,
          stage: "GROUP_STAGE",
          round: matches.length + 1,
        });
      }
    }

    groupMatches.push({ groupName, matches });
  }

  // Knockout stage: top 2 from each group advance
  const advanceCount = numGroups * 2;
  const knockoutBracket = generateSingleElimination(
    teams.slice(0, advanceCount),
  );

  return {
    groups,
    groupMatches,
    knockoutRounds: knockoutBracket.rounds,
  };
}

// --- Helper Functions ---

/**
 * Generates seeded positions for a bracket (standard tournament seeding).
 * e.g., for 8 teams: [0, 7, 4, 3, 5, 2, 1, 6]
 */
function generateSeededPositions(size: number): number[] {
  if (size === 2) return [0, 1];

  const positions: number[] = [0, 1];

  while (positions.length < size) {
    const newSize = positions.length * 2;
    const newPositions: number[] = [];

    for (const pos of positions) {
      newPositions.push(pos);
      newPositions.push(newSize - 1 - pos);
    }

    positions.length = 0;
    positions.push(...newPositions);
  }

  return positions;
}

/**
 * Maps a round number to the appropriate MatchStage enum value.
 */
function getStageForRound(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round + 1;

  if (roundsFromEnd === 1) return "FINAL";
  if (roundsFromEnd === 2) return "SEMI_FINAL";
  if (roundsFromEnd === 3) return "QUARTER_FINAL";
  if (roundsFromEnd === 4) return "ROUND_OF_16";
  return "GROUP_STAGE";
}

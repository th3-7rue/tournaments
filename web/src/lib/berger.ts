/**
 * Generates a Round Robin schedule using the Berger algorithm.
 * 
 * @param teams Array of team IDs or names
 * @param includeReverse If true, generates both home and away rounds (e.g. double round-robin)
 * @returns Array of rounds, where each round is an array of matches (tuples of [home, away])
 */
export function generateRoundRobin<T>(teams: T[], includeReverse: boolean = false): Array<Array<[T | null, T | null]>> {
  const schedule: Array<Array<[T | null, T | null]>> = [];
  const localTeams = [...teams];
  
  // Se le squadre sono dispari, aggiungiamo una squadra "riposo" (null)
  if (localTeams.length % 2 !== 0) {
    localTeams.push(null as unknown as T);
  }

  const numTeams = localTeams.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  // Array degli indici delle squadre (escludendo la prima che rimane fissa)
  const indices = localTeams.map((_, i) => i).slice(1);

  for (let round = 0; round < numRounds; round++) {
    const roundMatches: Array<[T | null, T | null]> = [];
    
    // Il primo match di ogni round coinvolge la squadra fissa (indice 0)
    // L'avversario è il primo elemento dell'array ruotato
    const fixedTeamIdx = 0;
    const rotatingTeamIdx = indices[0];
    
    // Alterniamo casa/trasferta per la squadra fissa per equilibrare
    if (round % 2 === 0) {
      roundMatches.push([localTeams[fixedTeamIdx], localTeams[rotatingTeamIdx]]);
    } else {
      roundMatches.push([localTeams[rotatingTeamIdx], localTeams[fixedTeamIdx]]);
    }

    // Le altre partite si formano accoppiando le restanti squadre (una dall'inizio, una dalla fine)
    for (let i = 1; i < halfSize; i++) {
      const homeIdx = indices[i];
      const awayIdx = indices[indices.length - i];
      roundMatches.push([localTeams[homeIdx], localTeams[awayIdx]]);
    }

    schedule.push(roundMatches);

    // Ruotiamo gli indici in senso orario (spostiamo l'ultimo elemento all'inizio)
    indices.unshift(indices.pop()!);
  }

  // Se è richiesto andata e ritorno
  if (includeReverse) {
    const reverseSchedule = schedule.map(round => 
      round.map(match => [match[1], match[0]] as [T | null, T | null])
    );
    return [...schedule, ...reverseSchedule];
  }

  return schedule;
}

export async function generateTournamentMatches(formData: FormData): Promise<void> {
  const tournamentId = formData.get("tournamentId") as string;
  
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, matches: true }
  });

  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.teams.length < 2) throw new Error("Servono almeno 2 squadre per generare il calendario");
  if (tournament.matches.length > 0) throw new Error("Il calendario è già stato generato");

  // Genera il calendario (solo andata per ora)
  const isDoubleRoundRobin = false; 
  const schedule = generateRoundRobin(tournament.teams, isDoubleRoundRobin);

  // Inizializza la classifica per tutte le squadre
  const standingsData = tournament.teams.map(team => ({
    tournamentId: tournament.id,
    teamId: team.id
  }));

  await prisma.standing.createMany({
    data: standingsData,
    skipDuplicates: true
  });

  let matchDate = new Date();
  
  for (let roundIndex = 0; roundIndex < schedule.length; roundIndex++) {
    const round = schedule[roundIndex];
    matchDate = new Date(matchDate);
    matchDate.setDate(matchDate.getDate() + 7); // Una partita a settimana
    
    for (const match of round) {
      const homeTeam = match[0];
      const awayTeam = match[1];

      // Se una squadra è "null", riposa
      if (!homeTeam || !awayTeam) continue;

      await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          stage: "GROUP_STAGE",
          matchDate: matchDate
        }
      });
    }
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: "ONGOING" }
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/matches`);
  revalidatePath(`/`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function updateMatchScore(formData: FormData): Promise<void> {
  const matchId = formData.get("matchId") as string;
  const homeScoreStr = formData.get("homeScore") as string;
  const awayScoreStr = formData.get("awayScore") as string;

  if (!matchId || !homeScoreStr || !awayScoreStr) throw new Error("Dati punteggio mancanti");

  const homeScore = parseInt(homeScoreStr);
  const awayScore = parseInt(awayScoreStr);

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      status: "FINISHED"
    }
  });

  await recalculateStandings(match.tournamentId);

  revalidatePath(`/admin/matches`);
  revalidatePath(`/tournament/${match.tournamentId}`);
  revalidatePath(`/`);
}

async function recalculateStandings(tournamentId: string) {
  await prisma.standing.updateMany({
    where: { tournamentId },
    data: { points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 }
  });

  const matches = await prisma.match.findMany({
    where: { tournamentId, status: "FINISHED", homeScore: { not: null }, awayScore: { not: null } }
  });

  const currentStandings = await prisma.standing.findMany({ where: { tournamentId } });
  const standingsMap = new Map<string, any>();
  currentStandings.forEach(s => standingsMap.set(s.teamId, s));

  for (const m of matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const h = standingsMap.get(m.homeTeamId);
    const a = standingsMap.get(m.awayTeamId);

    if (!h || !a) continue;

    h.matchesPlayed += 1;
    a.matchesPlayed += 1;
    h.goalsFor += m.homeScore!;
    a.goalsFor += m.awayScore!;
    h.goalsAgainst += m.awayScore!;
    a.goalsAgainst += m.homeScore!;
    h.goalDifference = h.goalsFor - h.goalsAgainst;
    a.goalDifference = a.goalsFor - a.goalsAgainst;

    if (m.homeScore! > m.awayScore!) {
      h.wins += 1;
      h.points += 3;
      a.losses += 1;
    } else if (m.homeScore! < m.awayScore!) {
      a.wins += 1;
      a.points += 3;
      h.losses += 1;
    } else {
      h.draws += 1;
      a.draws += 1;
      h.points += 1;
      a.points += 1;
    }
  }

  for (const s of standingsMap.values()) {
    await prisma.standing.update({
      where: { id: s.id },
      data: {
        points: s.points,
        matchesPlayed: s.matchesPlayed,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalDifference
      }
    });
  }
}

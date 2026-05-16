"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateRoundRobin } from "@/lib/berger";
import { io } from "socket.io-client";
import prisma from "@/lib/prisma";
import { actionLimiter } from "@/lib/rate-limit";
import { isVolleyballSport } from "@/lib/sports";
import {
  CreateTournamentSchema,
  CreateTeamSchema,
  UpdateScoreSchema,
} from "@/lib/validations";

export async function createTournament(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  // 1. Rate Limiting (5 richieste al minuto per utente/ip in memoria fittizia)
  // Per demo usiamo un token fisso, in prod si usa l'IP o l'ID utente
  try {
    await actionLimiter.check(5, "create_tournament_global");
  } catch (e: any) {
    return { error: e.message };
  }

  // 2. Validazione Zod
  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    format: formData.get("format") || "ROUND_ROBIN",
    sport: formData.get("sport") || "FOOTBALL",
    volleyballSets: formData.get("volleyballSets")
      ? parseInt(formData.get("volleyballSets") as string)
      : undefined,
  };

  const validated = CreateTournamentSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      error:
        "Validazione fallita: " +
        validated.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  await prisma.tournament.create({
    data: {
      name: validated.data.name,
      description: validated.data.description,
      format: validated.data.format as any,
      sport: validated.data.sport as any,
      volleyballSets: validated.data.volleyballSets,
    },
  });

  revalidatePath("/admin/tournaments");
  redirect("/admin/tournaments");
}

export async function createTeam(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const rawData = {
    name: formData.get("name"),
    tournamentId: formData.get("tournamentId"),
  };

  const validated = CreateTeamSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      error: validated.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  await prisma.team.create({
    data: {
      name: validated.data.name,
      tournamentId: validated.data.tournamentId,
    },
  });

  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

export async function generateTournamentMatches(
  formData: FormData,
): Promise<void> {
  const tournamentId = formData.get("tournamentId") as string;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, matches: true },
  });

  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.teams.length < 2)
    throw new Error("Servono almeno 2 squadre per generare il calendario");
  if (tournament.matches.length > 0)
    throw new Error("Il calendario è già stato generato");

  // Genera il calendario (solo andata per ora)
  const isDoubleRoundRobin = false;
  const schedule = generateRoundRobin(tournament.teams, isDoubleRoundRobin);

  // Inizializza la classifica per tutte le squadre
  const standingsData = tournament.teams.map((team) => ({
    tournamentId: tournament.id,
    teamId: team.id,
  }));

  await prisma.standing.createMany({
    data: standingsData,
    skipDuplicates: true,
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
          matchDate: matchDate,
        },
      });
    }
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: "ONGOING" },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/matches`);
  revalidatePath(`/`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function updateMatchScore(formData: FormData): Promise<void> {
  await actionLimiter.check(20, "update_score_global");

  const rawData = {
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore") || undefined,
    awayScore: formData.get("awayScore") || undefined,
    setScores: formData.get("setScores") || undefined,
  };

  const validated = UpdateScoreSchema.safeParse(rawData);
  if (!validated.success) {
    throw new Error("Validazione fallita");
  }

  const data = validated.data;
  let homeScore = data.homeScore || 0;
  let awayScore = data.awayScore || 0;
  let setScoresJson = data.setScores || null;

  if (setScoresJson) {
    homeScore = 0;
    awayScore = 0;
    setScoresJson.forEach((set: { home: number; away: number }) => {
      if (set.home > set.away) homeScore++;
      else if (set.away > set.home) awayScore++;
    });
  }

  const match = await (prisma.match as any).update({
    where: { id: data.matchId },
    data: {
      homeScore,
      awayScore,
      setScores: setScoresJson,
      status: "FINISHED",
    },
  });

  // Fetch tournament sport separately to avoid TS include type errors
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: match.tournamentId },
    select: { sport: true },
  });

  await recalculateStandings(match.tournamentId, tournament.sport);

  try {
    // Comunica al server Socket.io che c'è stato un aggiornamento
    const socket = io("http://localhost:3000");
    socket.emit("score-update", {
      matchId: data.matchId,
      homeScore,
      awayScore,
    });
    setTimeout(() => socket.disconnect(), 100);
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  revalidatePath(`/admin/matches`);
  revalidatePath(`/tournament/${match.tournamentId}`);
  revalidatePath(`/`);
}

export async function startMatch(matchId: string): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "LIVE" },
  });
  revalidatePath("/admin/matches");
  revalidatePath("/");
}

export async function recalculateStandings(
  tournamentId: string,
  sport: string,
) {
  await (prisma.standing as any).updateMany({
    where: { tournamentId },
    data: {
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDifference: 0,
    },
  });

  const matches = await (prisma.match as any).findMany({
    where: {
      tournamentId,
      status: "FINISHED",
      homeScore: { not: null },
      awayScore: { not: null },
    },
  });

  const currentStandings = await prisma.standing.findMany({
    where: { tournamentId },
  });
  const standingsMap = new Map<string, any>();
  currentStandings.forEach((s) => standingsMap.set(s.teamId, s));

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

    if (isVolleyballSport(sport)) {
      // Calculate pointsFor and pointsAgainst from setScores if available
      let mPointsForHome = 0;
      let mPointsForAway = 0;
      if (m.setScores) {
        try {
          const sets = m.setScores as any[];
          sets.forEach((set) => {
            mPointsForHome += Number(set.home) || 0;
            mPointsForAway += Number(set.away) || 0;
          });
        } catch (e) {}
      }

      h.pointsFor += mPointsForHome;
      a.pointsFor += mPointsForAway;
      h.pointsAgainst += mPointsForAway;
      a.pointsAgainst += mPointsForHome;
      h.pointsDifference = h.pointsFor - h.pointsAgainst;
      a.pointsDifference = a.pointsFor - a.pointsAgainst;

      if (m.homeScore! > m.awayScore!) {
        h.wins += 1;
        a.losses += 1;
        if (m.homeScore! === 3 && m.awayScore! <= 1) {
          h.points += 3;
        } else if (m.homeScore! === 3 && m.awayScore! === 2) {
          h.points += 2;
          a.points += 1;
        } else {
          // Fallback if not playing best of 5
          h.points += 3;
        }
      } else if (m.homeScore! < m.awayScore!) {
        a.wins += 1;
        h.losses += 1;
        if (m.awayScore! === 3 && m.homeScore! <= 1) {
          a.points += 3;
        } else if (m.awayScore! === 3 && m.homeScore! === 2) {
          a.points += 2;
          h.points += 1;
        } else {
          // Fallback if not playing best of 5
          a.points += 3;
        }
      }
    } else {
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
  }

  for (const s of standingsMap.values()) {
    await (prisma.standing as any).update({
      where: { id: s.id },
      data: {
        points: s.points,
        matchesPlayed: s.matchesPlayed,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDifference: s.goalDifference,
        pointsFor: s.pointsFor,
        pointsAgainst: s.pointsAgainst,
        pointsDifference: s.pointsDifference,
      },
    });
  }
}

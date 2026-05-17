"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { io } from "socket.io-client";
import prisma from "@/lib/prisma";
import { actionLimiter } from "@/lib/rate-limit";
import { isVolleyballSport } from "@/lib/sports";
import {
  CreateTournamentSchema,
  CreateTeamSchema,
  CreateGroupSchema,
  UpdateScoreSchema,
} from "@/lib/validations";
import {
  generateRoundRobin,
  generateSingleElimination,
  generateDoubleElimination,
  generateChampionsLeague,
} from "@/lib/brackets";

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
    groupId: formData.get("groupId") || null,
  };

  const validated = CreateTeamSchema.safeParse({
    name: rawData.name,
    tournamentId: rawData.tournamentId,
  });
  if (!validated.success) {
    return {
      error: validated.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  // Block adding teams to non-DRAFT tournaments
  const tournament = await prisma.tournament.findUnique({
    where: { id: validated.data.tournamentId },
    select: { status: true },
  });
  if (!tournament) return { error: "Torneo non trovato" };
  if (tournament.status !== "DRAFT") {
    return {
      error: `Impossibile aggiungere squadre a un torneo ${tournament.status === "ONGOING" ? "in corso" : "completato"}. Devi prima sbloccare il torneo.`,
    };
  }

  await prisma.team.create({
    data: {
      name: validated.data.name,
      tournamentId: validated.data.tournamentId,
      groupId: (rawData.groupId as string) || null,
    },
  });

  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

export async function deleteTeam(teamId: string): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tournament: true },
  });
  if (!team) throw new Error("Squadra non trovata");

  // Delete matches involving this team
  await prisma.match.deleteMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
  });

  // Delete standing
  await prisma.standing.deleteMany({
    where: { teamId },
  });

  await prisma.team.delete({ where: { id: teamId } });

  revalidatePath("/admin/teams");
  if (team.tournament) {
    revalidatePath(`/admin/tournaments/${team.tournamentId}`);
  }
}

export async function createGroup(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const rawData = {
    name: formData.get("name"),
    tournamentId: formData.get("tournamentId"),
  };

  const validated = CreateGroupSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      error: validated.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  await prisma.group.create({
    data: {
      name: validated.data.name,
      tournamentId: validated.data.tournamentId,
    },
  });

  revalidatePath(`/admin/tournaments/${validated.data.tournamentId}`);
  redirect(`/admin/tournaments/${validated.data.tournamentId}`);
}

export async function generateTournamentMatches(
  formData: FormData,
): Promise<void> {
  const tournamentId = formData.get("tournamentId") as string;
  const format = formData.get("format") || "ROUND_ROBIN";

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, matches: true },
  });

  if (!tournament) throw new Error("Torneo non trovato");
  if (tournament.status !== "DRAFT")
    throw new Error("Il calendario può essere generato solo per un torneo in fase di preparazione.");
  if (tournament.teams.length < 2)
    throw new Error("Servono almeno 2 squadre per generare il calendario");
  if (tournament.matches.length > 0)
    throw new Error("Il calendario è già stato generato");

  // Inizializza la classifica per tutte le squadre
  const standingsData = tournament.teams.map((team) => ({
    tournamentId: tournament.id,
    teamId: team.id,
  }));

  await prisma.standing.createMany({
    data: standingsData,
    skipDuplicates: true,
  });

  // Genera il calendario in base al formato
  let matchDate = new Date();
  let matchCount = 0;

  switch (format) {
    case "ROUND_ROBIN": {
      const isDoubleRoundRobin = false;
      const schedule = generateRoundRobin(tournament.teams, isDoubleRoundRobin);

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
              bracket: "NONE",
              matchDate: matchDate,
            },
          });
          matchCount++;
        }
      }
      break;
    }

    case "SINGLE_ELIMINATION": {
      const { rounds } = generateSingleElimination(tournament.teams);
      const totalRounds = rounds.length;

      for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
        const round = rounds[roundIdx];
        matchDate = new Date(matchDate);
        matchDate.setDate(matchDate.getDate() + 7);

        for (const match of round) {
          // Skip matches without teams
          if (!match.homeTeamId || !match.awayTeamId) continue;

          // Determine stage based on round number
          let stage: "GROUP_STAGE" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL" | "BRONZE_FINAL" =
            "GROUP_STAGE";
          const roundsFromEnd = totalRounds - roundIdx;
          if (roundsFromEnd === 1) stage = "FINAL";
          else if (roundsFromEnd === 2) stage = "SEMI_FINAL";
          else if (roundsFromEnd === 3) stage = "QUARTER_FINAL";
          else if (roundsFromEnd === 4) stage = "ROUND_OF_16";

          await prisma.match.create({
            data: {
              tournamentId: tournament.id,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              stage: stage,
              bracket: "WINNER",
              matchDate: matchDate,
            },
          });
          matchCount++;
        }
      }
      break;
    }

    case "DOUBLE_ELIMINATION": {
      const { winnerRounds, loserRounds, grandFinalMatch } = generateDoubleElimination(
        tournament.teams,
      );

      // Winner bracket
      const totalWinnerRounds = winnerRounds.length;
      for (let roundIdx = 0; roundIdx < totalWinnerRounds; roundIdx++) {
        const round = winnerRounds[roundIdx];
        matchDate = new Date(matchDate);
        matchDate.setDate(matchDate.getDate() + 7);

        for (const match of round) {
          if (!match.homeTeamId || !match.awayTeamId) continue;

          let stage: "GROUP_STAGE" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL" =
            "GROUP_STAGE";
          const roundsFromEnd = totalWinnerRounds - roundIdx;
          if (roundsFromEnd === 1) stage = "FINAL";
          else if (roundsFromEnd === 2) stage = "SEMI_FINAL";
          else if (roundsFromEnd === 3) stage = "QUARTER_FINAL";
          else if (roundsFromEnd === 4) stage = "ROUND_OF_16";

          await prisma.match.create({
            data: {
              tournamentId: tournament.id,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              stage: stage,
              bracket: "WINNER",
              matchDate: matchDate,
            },
          });
          matchCount++;
        }
      }

      // Loser bracket
      const totalLoserRounds = loserRounds.length;
      for (let roundIdx = 0; roundIdx < totalLoserRounds; roundIdx++) {
        const round = loserRounds[roundIdx];
        matchDate = new Date(matchDate);
        matchDate.setDate(matchDate.getDate() + 7);

        for (const match of round) {
          if (!match.homeTeamId || !match.awayTeamId) continue;

          let stage: "GROUP_STAGE" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL" =
            "GROUP_STAGE";
          const roundsFromEnd = totalLoserRounds - roundIdx;
          if (roundsFromEnd === 1) stage = "FINAL";
          else if (roundsFromEnd === 2) stage = "SEMI_FINAL";
          else if (roundsFromEnd === 3) stage = "QUARTER_FINAL";
          else if (roundsFromEnd === 4) stage = "ROUND_OF_16";

          await prisma.match.create({
            data: {
              tournamentId: tournament.id,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              stage: stage,
              bracket: "LOSER",
              matchDate: matchDate,
            },
          });
          matchCount++;
        }
      }

      // Grand final (if not already created)
      if (grandFinalMatch && grandFinalMatch.homeTeamId && grandFinalMatch.awayTeamId) {
        matchDate = new Date(matchDate);
        matchDate.setDate(matchDate.getDate() + 7);

        await prisma.match.create({
          data: {
            tournamentId: tournament.id,
            homeTeamId: grandFinalMatch.homeTeamId,
            awayTeamId: grandFinalMatch.awayTeamId,
            stage: "FINAL",
            bracket: "WINNER",
            matchDate: matchDate,
          },
        });
        matchCount++;
      }
      break;
    }

    case "CHAMPIONS_LEAGUE": {
      const { groups, groupMatches, knockoutRounds } = generateChampionsLeague(
        tournament.teams,
        tournament.volleyballSets,
      );

      // Create groups in database
      const groupPromises = groups.map(async (group) => {
        return prisma.group.create({
          data: {
            name: group.name,
            tournamentId: tournament.id,
          },
        });
      });

      // Create group matches
      for (const gm of groupMatches) {
        matchDate = new Date(matchDate);
        matchDate.setDate(matchDate.getDate() + 7);

        for (const match of gm.matches) {
          if (!match.homeTeamId || !match.awayTeamId) continue;

          await prisma.match.create({
            data: {
              tournamentId: tournament.id,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              stage: "GROUP_STAGE",
              bracket: "NONE",
              matchDate: matchDate,
            },
          });
          matchCount++;
        }
      }

      // Create knockout bracket matches
      const totalKnockoutRounds = knockoutRounds.length;
      for (let roundIdx = 0; roundIdx < totalKnockoutRounds; roundIdx++) {
        const round = knockoutRounds[roundIdx];
        matchDate = new Date(matchDate);
        matchDate.setDate(matchDate.getDate() + 7);

        for (const match of round) {
          if (!match.homeTeamId || !match.awayTeamId) continue;

          let stage: "GROUP_STAGE" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL" =
            "GROUP_STAGE";
          const roundsFromEnd = totalKnockoutRounds - roundIdx;
          if (roundsFromEnd === 1) stage = "FINAL";
          else if (roundsFromEnd === 2) stage = "SEMI_FINAL";
          else if (roundsFromEnd === 3) stage = "QUARTER_FINAL";
          else if (roundsFromEnd === 4) stage = "ROUND_OF_16";

          await prisma.match.create({
            data: {
              tournamentId: tournament.id,
              homeTeamId: match.homeTeamId,
              awayTeamId: match.awayTeamId,
              stage: stage,
              bracket: "WINNER",
              matchDate: matchDate,
            },
          });
          matchCount++;
        }
      }

      // Create group records
      await Promise.all(groupPromises);

      // Assign teams to groups (create Team records with groupId)
      // This is handled by the Group creation cascade, but we need to ensure teams are assigned
      for (let g = 0; g < groups.length; g++) {
        const groupTeamIds = groups[g].teamIds;
        for (let t = 0; t < groupTeamIds.length; t++) {
          const team = tournament.teams.find((tm) => tm.id === groupTeamIds[t]);
          if (team) {
            await prisma.team.update({
              where: { id: team.id },
              data: { groupId: await (prisma.group as any).findUnique({ where: { name: groups[g].name } })?.id },
            });
          }
        }
      }
      break;
    }

    default:
      throw new Error(`Formato non supportato: ${format}`);
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

  // Aggiorna le classifiche in modo incrementale per le squadre coinvolte
  await updateStandings(match.id);

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

/**
 * Aggiorna in modo incrementale le classifiche per le due squadre di un singolo match.
 * Questo evita di ricalcolare l'intero torneo quando non necessario.
 */
export async function updateStandings(matchId: string) {
  const match = await (prisma.match as any).findUnique({
    where: { id: matchId },
    select: {
      id: true,
      tournamentId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      setScores: true,
    },
  });

  if (!match) return;
  if (!match.homeTeamId || !match.awayTeamId) return;

  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: match.tournamentId },
    select: { sport: true },
  });

  const sport = tournament.sport as string;

  // Carica tutte le partite finite del torneo per ciascuna delle due squadre
  const teamIds = [match.homeTeamId, match.awayTeamId];

  for (const teamId of teamIds) {
    const finishedMatches = await (prisma.match as any).findMany({
      where: {
        tournamentId: match.tournamentId,
        status: "FINISHED",
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
    });

    // Inizializza aggregati
    const agg = {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDifference: 0,
    } as any;

    for (const m of finishedMatches) {
      const isHome = m.homeTeamId === teamId;
      const teamScore = isHome ? m.homeScore ?? 0 : m.awayScore ?? 0;
      const oppScore = isHome ? m.awayScore ?? 0 : m.homeScore ?? 0;

      agg.matchesPlayed += 1;
      agg.goalsFor += Number(teamScore) || 0;
      agg.goalsAgainst += Number(oppScore) || 0;

      if (isVolleyballSport(sport)) {
        // pointsFor/Against from setScores
        if (m.setScores) {
          try {
            const sets = m.setScores as any[];
            for (const s of sets) {
              agg.pointsFor += Number(isHome ? s.home : s.away) || 0;
              agg.pointsAgainst += Number(isHome ? s.away : s.home) || 0;
            }
          } catch (e) {}
        }

        if (m.homeScore! > m.awayScore!) {
          if (isHome) {
            agg.wins += 1;
            if (m.homeScore === 3 && m.awayScore! <= 1) agg.points += 3;
            else if (m.homeScore === 3 && m.awayScore === 2) agg.points += 2;
            else agg.points += 3;
          } else {
            agg.losses += 1;
            if (m.homeScore === 3 && m.awayScore! <= 1) agg.points += 0;
            else if (m.homeScore === 3 && m.awayScore === 2) agg.points += 1;
          }
        } else if (m.homeScore! < m.awayScore!) {
          if (!isHome) {
            agg.wins += 1;
            if (m.awayScore === 3 && m.homeScore! <= 1) agg.points += 3;
            else if (m.awayScore === 3 && m.homeScore === 2) agg.points += 2;
            else agg.points += 3;
          } else {
            agg.losses += 1;
            if (m.awayScore === 3 && m.homeScore! <= 1) agg.points += 0;
            else if (m.awayScore === 3 && m.homeScore === 2) agg.points += 1;
          }
        }
      } else {
        if (teamScore > oppScore) {
          agg.wins += 1;
          agg.points += 3;
        } else if (teamScore < oppScore) {
          agg.losses += 1;
        } else {
          agg.draws += 1;
          agg.points += 1;
        }
      }
    }

    agg.goalDifference = agg.goalsFor - agg.goalsAgainst;
    agg.pointsDifference = agg.pointsFor - agg.pointsAgainst;

    // Upsert/update standing for the team
    const standing = await prisma.standing.findFirst({
      where: { tournamentId: match.tournamentId, teamId },
    });

    if (standing) {
      await (prisma.standing as any).update({
        where: { id: standing.id },
        data: {
          points: agg.points,
          matchesPlayed: agg.matchesPlayed,
          wins: agg.wins,
          draws: agg.draws,
          losses: agg.losses,
          goalsFor: agg.goalsFor,
          goalsAgainst: agg.goalsAgainst,
          goalDifference: agg.goalDifference,
          pointsFor: agg.pointsFor,
          pointsAgainst: agg.pointsAgainst,
          pointsDifference: agg.pointsDifference,
        },
      });
    }
  }

  // Revalidate tournament pages
  revalidatePath(`/admin/matches`);
  revalidatePath(`/tournament/${match.tournamentId}`);
  revalidatePath(`/`);
}

export async function deleteTournament(formData: FormData) {
  const id = formData.get("tournamentId") as string;
  if (!id) throw new Error("ID torneo mancante");

  // Cancella il torneo — le relazioni Prisma sono impostate con onDelete: Cascade
  await prisma.tournament.delete({ where: { id } });

  revalidatePath(`/admin/tournaments`);
  revalidatePath(`/`);
  redirect(`/admin/tournaments`);
}

export async function startMatch(matchId: string): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "LIVE" },
  });
  revalidatePath("/admin/matches");
  revalidatePath("/");
}

export async function deleteMatch(matchId: string): Promise<{ error?: string }> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      tournamentId: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
      nextMatchId: true,
      nextLoserMatchId: true,
    },
  });
  if (!match) return { error: "Partita non trovata" };

  if (match.status === "FINISHED") {
    // Invalidate downstream bracket links
    if (match.nextMatchId) {
      await prisma.match.updateMany({
        where: { id: match.nextMatchId },
        data: { homeTeamId: null, awayTeamId: null },
      });
    }
    if (match.nextLoserMatchId) {
      await prisma.match.updateMany({
        where: { id: match.nextLoserMatchId },
        data: { homeTeamId: null, awayTeamId: null },
      });
    }
  }

  await prisma.match.delete({ where: { id: matchId } });

  revalidatePath(`/admin/matches`);
  revalidatePath(`/admin/tournaments/${match.tournamentId}`);
  return {};
}

export async function updateTournament(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string }> {
  const rawData = {
    tournamentId: formData.get("tournamentId"),
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  };

  if (!rawData.tournamentId || !rawData.name) {
    return { error: "Campi obbligatori mancanti" };
  }

  const tournamentId = rawData.tournamentId as string;
  const name = rawData.name as string;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) return { error: "Torneo non trovato" };

  // Check if tournament is locked (schedule generated or matches exist)
  if (tournament.status === "ONGOING") {
    return { error: "Non puoi modificare un torneo già avviato. Devi prima sbloccarlo." };
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      name: name,
      startDate: rawData.startDate ? new Date(rawData.startDate as string) : null,
      endDate: rawData.endDate ? new Date(rawData.endDate as string) : null,
    },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function lockTournament(tournamentId: string): Promise<{ error?: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, matches: true },
  });
  if (!tournament) return { error: "Torneo non trovato" };

  if (tournament.matches.length > 0) {
    return { error: "Questo torneo ha già un calendario generato. Non è più modificabile." };
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "ONGOING" },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function unlockTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: true },
  });
  if (!tournament) throw new Error("Torneo non trovato");

  if (tournament.status === "COMPLETED") {
    throw new Error("Non puoi sbloccare un torneo completato.");
  }

  // Clear all generated matches, standings and groups
  if (tournament.matches.length > 0) {
    await prisma.match.deleteMany({
      where: { tournamentId },
    });
    await prisma.standing.deleteMany({
      where: { tournamentId },
    });
    await prisma.group.deleteMany({
      where: { tournamentId },
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "DRAFT" },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function deleteGroup(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const groupId = formData.get("groupId") as string;
  const tournamentId = formData.get("tournamentId") as string;

  if (!groupId || !tournamentId) {
    return { error: "ID mancanti" };
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { tournament: true },
  });
  if (!group) return { error: "Girone non trovato" };

  // Delete all teams in this group (cascade will delete their matches and standings)
  const teamsInGroup = await prisma.team.findMany({
    where: { groupId },
  });
  for (const team of teamsInGroup) {
    await prisma.team.delete({ where: { id: team.id } });
  }

  // Delete the group
  await prisma.group.delete({ where: { id: groupId } });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/groups`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function assignTeamToGroup(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const teamId = formData.get("teamId") as string;
  const groupId = formData.get("groupId") as string;
  const tournamentId = formData.get("tournamentId") as string;

  if (!teamId || !groupId || !tournamentId) {
    return { error: "ID mancanti" };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tournament: true },
  });
  if (!team) return { error: "Squadra non trovata" };

  // Check if team already belongs to this group
  if (team.groupId === groupId) {
    return { error: "Questa squadra è già in questo girone" };
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { tournament: true },
  });
  if (!group || group.tournamentId !== tournamentId) {
    return { error: "Girone non trovato o non appartiene a questo torneo" };
  }

  // Check if team is already in another group
  if (team.groupId) {
    await prisma.team.update({
      where: { id: teamId },
      data: { groupId: null },
    });
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { groupId },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/groups`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function deleteTeamFromGroup(
  prevState: any,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const teamId = formData.get("teamId") as string;
  const tournamentId = formData.get("tournamentId") as string;

  if (!teamId || !tournamentId) {
    return { error: "ID mancanti" };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tournament: true },
  });
  if (!team) return { error: "Squadra non trovata" };

  if (team.tournamentId !== tournamentId) {
    return { error: "Squadra non appartiene a questo torneo" };
  }

  // Remove from group (set to null)
  await prisma.team.update({
    where: { id: teamId },
    data: { groupId: null },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}/groups`);
  redirect(`/admin/tournaments/${tournamentId}`);
}

export async function checkAndCompleteTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: true },
  });
  if (!tournament) return;

  if (tournament.status === "COMPLETED") return;

  const allFinished = tournament.matches.length > 0 && tournament.matches.every(m => m.status === "FINISHED");

  if (allFinished) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "COMPLETED" },
    });
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/`);
}

export async function recalculateStandings(
  tournamentId: string,
  sport: string,
) {
  // Reset all standings to 0 first
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

  // Fetch all finished matches (including those with missing scores for validation)
  const matches = await (prisma.match as any).findMany({
    where: {
      tournamentId,
      status: "FINISHED",
    },
  });

  // Filter matches with valid scores and team IDs
  const validMatches = matches.filter(
    (m: any) => m.homeScore !== null && m.awayScore !== null && m.homeScore !== undefined && m.awayScore !== undefined && m.homeTeamId && m.awayTeamId
  );

  const currentStandings = await prisma.standing.findMany({
    where: { tournamentId },
  });
  const standingsMap = new Map<string, any>();
  currentStandings.forEach((s) => standingsMap.set(s.teamId, s));

  for (const m of validMatches) {
    const h = standingsMap.get(m.homeTeamId!);
    const a = standingsMap.get(m.awayTeamId!);

    if (!h || !a) continue;

    h.matchesPlayed += 1;
    a.matchesPlayed += 1;
    h.goalsFor += Number(m.homeScore);
    a.goalsFor += Number(m.awayScore);
    h.goalsAgainst += Number(m.awayScore);
    a.goalsAgainst += Number(m.homeScore);

    if (isVolleyballSport(sport)) {
      // Volleyball scoring rules
      const homeScore = Number(m.homeScore);
      const awayScore = Number(m.awayScore);
      let setScores: any[] = [];

      if (m.setScores) {
        try {
          setScores = Array.isArray(m.setScores) ? m.setScores : JSON.parse(JSON.stringify(m.setScores));
        } catch (e) {}
      }

      // Calculate pointsFor and pointsAgainst from setScores
      let mPointsForHome = 0;
      let mPointsForAway = 0;
      try {
        setScores.forEach((set: any) => {
          if (set && typeof set.home === "number") mPointsForHome += set.home;
          if (set && typeof set.away === "number") mPointsForAway += set.away;
        });
      } catch (e) {}

      h.pointsFor += mPointsForHome;
      a.pointsFor += mPointsForAway;
      h.pointsAgainst += mPointsForAway;
      a.pointsAgainst += mPointsForHome;

      h.goalDifference = h.goalsFor - h.goalsAgainst;
      a.goalDifference = a.goalsFor - a.goalsAgainst;
      h.pointsDifference = h.pointsFor - h.pointsAgainst;
      a.pointsDifference = a.pointsFor - a.pointsAgainst;

      if (homeScore > awayScore) {
        h.wins += 1;
        a.losses += 1;
        if (homeScore === 3 && awayScore <= 1) {
          h.points += 3;
        } else if (homeScore === 3 && awayScore === 2) {
          h.points += 2;
          a.points += 1;
        } else {
          h.points += 3;
        }
      } else if (awayScore > homeScore) {
        a.wins += 1;
        h.losses += 1;
        if (awayScore === 3 && homeScore <= 1) {
          a.points += 3;
        } else if (awayScore === 3 && homeScore === 2) {
          a.points += 2;
          h.points += 1;
        } else {
          a.points += 3;
        }
      } else {
        h.points += 1;
        a.points += 1;
      }
    } else {
      // Football/soccer scoring rules
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

  // Update all standings
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

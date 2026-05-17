"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteMatchServerAction(matchId: string) {
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

  if (!match) {
    return { error: "Partita non trovata" };
  }

  // If match is FINISHED, invalidate downstream bracket links
  if (match.status === "FINISHED") {
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

  return { ok: true };
}

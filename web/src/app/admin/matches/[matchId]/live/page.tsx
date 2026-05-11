import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import LiveScorer from "./LiveScorer"

export default async function LiveScorerPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params

  const match = await (prisma.match as any).findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      tournament: true,
    }
  })

  if (!match) return notFound()

  return (
    <LiveScorer
      matchId={match.id}
      tournamentId={match.tournamentId}
      sport={match.tournament.sport}
      maxSets={match.tournament.volleyballSets || 5}
      homeName={match.homeTeam?.name ?? 'Casa'}
      awayName={match.awayTeam?.name ?? 'Ospiti'}
      initialSetScores={match.setScores ?? []}
      initialHomeScore={match.homeScore ?? 0}
      initialAwayScore={match.awayScore ?? 0}
      initialStatus={match.status}
    />
  )
}

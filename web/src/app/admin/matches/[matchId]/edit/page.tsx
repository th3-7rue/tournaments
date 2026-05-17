import MatchForm from "../../MatchForm";
import prisma from "@/lib/prisma";
import { deleteMatchServerAction } from "@/app/delete-match";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditMatchPage({
  params,
}: {
  params: { matchId: string };
}) {
  const { matchId } = params;

  // Fetch tournament and match
  let tournament;
  try {
    tournament = await prisma.tournament.findFirst({
      where: { status: { in: ["ONGOING", "COMPLETED"] } },
    });
    if (!tournament) {
      redirect("/admin/matches");
    }
  } catch (e) {
    redirect("/admin/matches");
  }

  let match;
  try {
    match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) {
      redirect("/admin/matches");
    }
  } catch (e) {
    redirect("/admin/matches");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Modifica Partita</h1>
        <form
          action={async () => {
            "use server";
            const result = await deleteMatchServerAction(matchId);
            if (result?.error) {
              throw new Error(result.error);
            }
          }}
          className="inline"
        >
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            🗑️ Elimina
          </button>
        </form>
      </div>
      <MatchForm match={match} tournament={tournament} />
    </div>
  );
}

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { undoMatchScore } from "@/app/undo-match-score";

export const dynamic = "force-dynamic";

export default async function MatchHistoryPage({
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

  // Fetch history entries
  let history: any[] = [];
  try {
    // Check if MatchHistory model exists in Prisma client
    if (typeof (prisma as any).matchHistory !== 'undefined') {
      history = await prisma.matchHistory.findMany({
        where: { matchId },
        orderBy: { editedAt: "desc" },
        select: {
          previousHomeScore: true,
          previousAwayScore: true,
          previousSetScores: true,
        },
      });
    }
  } catch (e: any) {
    console.error("Error fetching history:", e);
  }

  if (!history || history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Storia Modifiche</h1>
        <p className="text-slate-600">Nessuna modifica registrata per questa partita</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Storia Modifiche</h1>
          <p className="text-slate-600 mt-1">
            Partita: {match.homeTeam?.name} vs {match.awayTeam?.name}
          </p>
        </div>
        <a
          href={`/admin/matches/${matchId}/edit`}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          ✎ Modifica
        </a>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {history.map((entry, index) => (
          <div
            key={entry.id}
            className={`border-b border-slate-200 last:border-b-0 ${
              index === 0 ? "bg-blue-50" : ""
            }`}
          >
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(entry.editedAt).toLocaleString()}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Ultima
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">
                    Da:{" "}
                    {entry.previousHomeScore !== undefined && entry.previousAwayScore !== undefined
                      ? `${entry.previousHomeScore}-${entry.previousAwayScore}`
                      : "Nessun punteggio precedente"}
                  </p>
                  <p className="text-sm text-slate-700">
                    A: {entry.homeScore !== undefined && entry.awayScore !== undefined
                      ? `${entry.homeScore}-${entry.awayScore}`
                      : "Nessun punteggio nuovo"}
                  </p>
                </div>
                <div className="text-right">
                  {index === 0 && (
                    <form
                      action={async () => {
                        "use server";
                        // Check if MatchHistory model is available
                        if (typeof (prisma as any).matchHistory === 'undefined') {
                          alert("MatchHistory non ancora disponibile. Ricaricare la pagina.");
                          return;
                        }
                        const result = await undoMatchScore(matchId);
                        if (result.success) {
                          // Redirect back to edit page
                          window.location.href = `/admin/matches/${matchId}/edit`;
                        } else {
                          // Show error
                          alert(result.error);
                        }
                      }}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                      >
                        ↩️ Annulla
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Girone:</span>{" "}
                  {entry.match?.groupId ? (
                    <span className="text-slate-700">Girone</span>
                  ) : (
                    <span className="text-slate-700">Tabellone</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">Stato:</span>{" "}
                  <span className="text-slate-700">{entry.status || "SCHEDULED"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

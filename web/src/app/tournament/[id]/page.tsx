import Link from "next/link";
import LiveMatchGrid from "./LiveMatchGrid";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = (await (prisma.tournament as any).findUnique({
    where: { id },
    include: {
      matches: {
        include: { homeTeam: true, awayTeam: true },
        orderBy: { matchDate: "asc" },
      },
      standings: {
        include: { team: true },
        orderBy: [
          { points: "desc" },
          { goalDifference: "desc" },
          { goalDifference: "desc" }, // secondary: set diff (uses goalDifference field)
        ],
      },
    },
  })) as any;

  if (!tournament)
    return <div className="p-8 text-center text-xl">Torneo non trovato</div>;

  const sportLabels = {
    FOOTBALL: {
      for: "GF",
      against: "GS",
      diff: "DR",
      forTitle: "Gol Fatti",
      againstTitle: "Gol Subiti",
      diffTitle: "Differenza Reti",
    },
    VOLLEYBALL: {
      for: "SF",
      against: "SS",
      diff: "DS",
      forTitle: "Set Vinti",
      againstTitle: "Set Persi",
      diffTitle: "Differenza Set",
    },
    TENNIS: {
      for: "SF",
      against: "SS",
      diff: "DS",
      forTitle: "Set Vinti",
      againstTitle: "Set Persi",
      diffTitle: "Differenza Set",
    },
    PADEL: {
      for: "SF",
      against: "SS",
      diff: "DS",
      forTitle: "Set Vinti",
      againstTitle: "Set Persi",
      diffTitle: "Differenza Set",
    },
    BASKETBALL: {
      for: "PF",
      against: "PS",
      diff: "DP",
      forTitle: "Punti Fatti",
      againstTitle: "Punti Subiti",
      diffTitle: "Differenza Punti",
    },
    CUSTOM: {
      for: "PF",
      against: "PS",
      diff: "DP",
      forTitle: "Punti Fatti",
      againstTitle: "Punti Subiti",
      diffTitle: "Differenza Punti",
    },
  };
  const labels =
    sportLabels[tournament.sport as keyof typeof sportLabels] ||
    sportLabels.CUSTOM;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white pt-12 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 mb-6 inline-block"
          >
            ← Torna ai tornei
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">
                {tournament.name}
              </h1>
              <p className="text-slate-400 font-medium text-lg uppercase tracking-wider">
                {tournament.sport} • {tournament.format.replace("_", " ")}
              </p>
            </div>
            <div className="bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              <span className="text-indigo-200 tracking-wider">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-12 space-y-8 pb-20">
        {/* CLASSIFICA */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Classifica in tempo reale
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="py-4 px-6 font-semibold w-12">#</th>
                  <th className="py-4 px-6 font-semibold">Squadra</th>
                  <th
                    className="py-4 px-4 font-bold text-slate-800 text-center"
                    title="Punti"
                  >
                    PTS
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title="Giocate"
                  >
                    G
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title="Vittorie"
                  >
                    V
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title="Pareggi"
                  >
                    N
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title="Sconfitte"
                  >
                    P
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title={labels.forTitle}
                  >
                    {labels.for}
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title={labels.againstTitle}
                  >
                    {labels.against}
                  </th>
                  <th
                    className="py-4 px-3 font-semibold text-center"
                    title={labels.diffTitle}
                  >
                    {labels.diff}
                  </th>
                  {tournament.sport === "VOLLEYBALL" && (
                    <>
                      <th
                        className="py-4 px-3 font-semibold text-center text-xs"
                        title="Punti Fatti"
                      >
                        PF
                      </th>
                      <th
                        className="py-4 px-3 font-semibold text-center text-xs"
                        title="Punti Subiti"
                      >
                        PS
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {tournament.standings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center text-slate-500"
                    >
                      Nessuna classifica disponibile
                    </td>
                  </tr>
                ) : (
                  tournament.standings.map((s: any, idx: number) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition group"
                    >
                      <td className="py-4 px-6 text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-sm">
                          {s.team.name.substring(0, 2).toUpperCase()}
                        </div>
                        {s.team.name}
                      </td>
                      <td className="py-4 px-4 font-black text-indigo-600 text-lg text-center bg-indigo-50/30 group-hover:bg-indigo-50 transition">
                        {s.points}
                      </td>
                      <td className="py-4 px-3 font-medium text-slate-600 text-center">
                        {s.matchesPlayed}
                      </td>
                      <td className="py-4 px-3 font-medium text-emerald-600 text-center">
                        {s.wins}
                      </td>
                      <td className="py-4 px-3 font-medium text-amber-600 text-center">
                        {s.draws}
                      </td>
                      <td className="py-4 px-3 font-medium text-red-600 text-center">
                        {s.losses}
                      </td>
                      <td className="py-4 px-3 font-medium text-slate-600 text-center">
                        {s.goalsFor}
                      </td>
                      <td className="py-4 px-3 font-medium text-slate-600 text-center">
                        {s.goalsAgainst}
                      </td>
                      <td className="py-4 px-3 font-bold text-slate-700 text-center">
                        {s.goalDifference > 0
                          ? `+${s.goalDifference}`
                          : s.goalDifference}
                      </td>
                      {tournament.sport === "VOLLEYBALL" && (
                        <>
                          <td className="py-4 px-3 font-medium text-slate-500 text-center text-sm">
                            {s.pointsFor || 0}
                          </td>
                          <td className="py-4 px-3 font-medium text-slate-500 text-center text-sm">
                            {s.pointsAgainst || 0}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CALENDARIO */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              ⚽ Calendario Partite
            </h2>
          </div>
          <div className="p-6 bg-slate-50/50">
            {tournament.matches.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                Calendario non ancora generato.
              </p>
            ) : (
              <LiveMatchGrid
                tournamentId={tournament.id}
                initialMatches={tournament.matches}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

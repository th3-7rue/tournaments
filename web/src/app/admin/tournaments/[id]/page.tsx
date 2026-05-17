import { generateTournamentMatches, unlockTournament } from "@/app/actions";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { SPORT_DISPLAY_NAMES } from "@/lib/sports";
import { default as dynamicImport } from "next/dynamic";

const DeleteTournamentButton = dynamicImport(
  () => import("@/components/DeleteTournamentButton"),
);

export const dynamic = "force-dynamic";

export default async function TournamentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: true,
      groups: {
        include: {
          teams: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
      },
      matches: {
        include: { homeTeam: true, awayTeam: true },
        orderBy: { matchDate: "asc" },
      },
    },
  });

  if (!tournament) return <div>Torneo non trovato</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            {tournament.name}
          </h1>
          <p className="text-slate-500 mt-2">
            {SPORT_DISPLAY_NAMES[
              tournament.sport as keyof typeof SPORT_DISPLAY_NAMES
            ] ?? tournament.sport}{" "}
            • {tournament.format.replace("_", " ")}
          </p>
        </div>
        <span
          className={`px-4 py-1.5 rounded-full text-sm font-semibold ${tournament.status === "DRAFT" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
        >
          {tournament.status === "DRAFT" ? "In Preparazione" : "In Corso"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {tournament.status === "DRAFT" && tournament.groups.length > 0 && (
          <Link
            href={`/admin/tournaments/${id}/groups`}
            className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-2"
          >
            📋 Gestione Gironi →
          </Link>
        )}
        <Link
          href={`/admin/tournaments/${id}/edit`}
          className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-2"
        >
          ✎ Modifica Torneo →
        </Link>
      </div>

      {/* Groups Summary */}
      {tournament.groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tournament.groups.map((group) => (
            <div
              key={group.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
            >
              <div className="font-bold text-slate-800 text-lg mb-1">
                {group.name}
              </div>
              <div className="text-sm text-slate-500">
                {group.teams.length} squadra{group.teams.length !== 1 ? "e" : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              Squadre ({tournament.teams.length})
            </h2>
            {tournament.status === "DRAFT" && (
              <Link
                href="/admin/teams/new"
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                + Aggiungi
              </Link>
            )}
            {tournament.status !== "DRAFT" && (
              <span className="text-xs text-slate-400 italic">
                {tournament.status === "ONGOING" ? "Aggiunta squadre non disponibile" : "Torneo completato"}
              </span>
            )}
          </div>

          {tournament.teams.length === 0 ? (
            <p className="text-slate-500 italic">Nessuna squadra iscritta.</p>
          ) : (
            <ul className="space-y-2 max-h-100 overflow-y-auto pr-2">
              {tournament.teams.map((t: any) => (
                <li
                  key={t.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-700 flex items-center gap-3 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {t.name.substring(0, 2).toUpperCase()}
                  </div>
                  {t.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Calendario</h2>
            <div className="flex items-center gap-3">
              {tournament.matches.length > 0 && (
              <Link
                href="/admin/matches"
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Inserisci Risultati →
              </Link>
              )}
              {tournament.status === "ONGOING" && tournament.matches.length === 0 && (
                <form action={unlockTournament.bind(null, tournament.id)}>
                  <button
                    type="submit"
                    className="text-sm text-amber-600 font-medium hover:underline"
                  >
                    Sblocca Torneo
                  </button>
                </form>
              )}
              <DeleteTournamentButton tournamentId={tournament.id} />
            </div>
          </div>

          {tournament.matches.length === 0 ? (
            <div className="text-center py-10 grow flex flex-col justify-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-slate-500 mb-6">
                Il calendario non è ancora stato generato.
              </p>
              {tournament.status !== "DRAFT" ? (
                <p className="text-slate-400 text-sm">
                  Il torneo non è più in fase di preparazione.{" "}
                  <form action={unlockTournament.bind(null, tournament.id)} className="inline">
                    <button
                      type="submit"
                      className="text-amber-600 font-medium hover:underline"
                    >
                      Sblocca
                    </button>
                  </form>{" "}
                  per tornare a modificarlo.
                </p>
              ) : tournament.teams.length >= 2 ? (
                <form action={generateTournamentMatches}>
                  <input
                    type="hidden"
                    name="tournamentId"
                    value={tournament.id}
                  />
                  <button
                    type="submit"
                    className="bg-linear-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition w-full hover:scale-[1.02]"
                  >
                    Genera Calendario Automagico
                  </button>
                </form>
              ) : (
                <p className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">
                  ⚠️ Inserisci almeno 2 squadre per generare le partite.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-100 overflow-y-auto pr-2 grow">
              {tournament.matches.map((m: any) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center p-3 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-indigo-300 transition"
                >
                  <div
                    className="text-sm font-bold text-slate-700 w-1/3 text-right truncate"
                    title={m.homeTeam?.name}
                  >
                    {m.homeTeam?.name}
                  </div>
                  <div
                    className={`px-3 py-1 rounded text-center min-w-17.5 font-black tracking-wider text-sm mx-2 ${m.status === "FINISHED" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {m.status === "FINISHED"
                      ? `${m.homeScore} - ${m.awayScore}`
                      : "VS"}
                  </div>
                  <div
                    className="text-sm font-bold text-slate-700 w-1/3 text-left truncate"
                    title={m.awayTeam?.name}
                  >
                    {m.awayTeam?.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

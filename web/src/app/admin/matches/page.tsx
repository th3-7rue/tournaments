"use client";

import MatchForm from "./MatchForm";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { deleteMatchServerAction } from "@/app/delete-match";
import { useEffect, useState } from "react";
import { deleteMatch } from "@/app/actions";
import { SPORT_DISPLAY_NAMES } from "@/lib/sports";
import DeleteButton from "./DeleteButton";

interface TournamentData {
  id: string;
  name: string;
  sport: string;
  matches: Array<{
    id: string;
    homeTeam: { name: string };
    awayTeam: { name: string };
    status: string;
  }>;
}

export const dynamic = "force-dynamic";

export default function AdminMatchesPage() {
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch("/api/admin/matches", { cache: "no-store" });
        const data = await res.json();
        setTournaments(data);
      } catch (e) {
        console.error("Failed to fetch tournaments:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-2xl font-semibold text-slate-600">
          Caricamento risultati...
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-5xl mb-4">⚽</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Nessun torneo in corso
        </h2>
        <p className="text-slate-500">
          Per inserire i risultati, devi prima generare il calendario di un
          torneo dalla sua pagina di dettaglio.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
          Risultati Partite
        </h1>
        <p className="text-slate-500">
          Inserisci i risultati manualmente, o usa il{" "}
          <span className="font-semibold text-indigo-600">segnapunti live</span>{" "}
          (▶) per registrare punto per punto direttamente dal telefono.
        </p>
      </div>

      {tournaments.map((tournament) => (
        <div
          key={tournament.id}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
            <span className="text-xs font-semibold bg-indigo-500/30 text-indigo-100 px-3 py-1 rounded-full">
              {SPORT_DISPLAY_NAMES[
                tournament.sport as keyof typeof SPORT_DISPLAY_NAMES
              ] ?? tournament.sport}
            </span>
          </div>

          <div className="p-6 space-y-3 max-h-175 overflow-y-auto">
            {tournament.matches.length === 0 ? (
              <p className="text-slate-500 italic">Nessuna partita generata.</p>
            ) : (
              tournament.matches.map((m) => (
                <div key={m.id} className="space-y-2">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    {m.status !== "FINISHED" && (
                      <Link
                        href={`/admin/matches/${m.id}/live`}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${
                          m.status === "LIVE"
                            ? "bg-red-100 text-red-700 hover:bg-red-200 ring-1 ring-red-300"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        }`}
                      >
                        {m.status === "LIVE" ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                            Segnapunti Live →
                          </>
                        ) : (
                          <>▶ Inizia partita</>
                        )}
                      </Link>
                    )}
                    <Link
                      href={`/admin/matches/${m.id}/edit`}
                      className="text-xs text-slate-400 hover:text-slate-600 transition"
                    >
                      ✎ Modifica
                    </Link>
                    <DeleteButton matchId={m.id} />
                  </div>

                  <MatchForm match={m} tournament={tournament} />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

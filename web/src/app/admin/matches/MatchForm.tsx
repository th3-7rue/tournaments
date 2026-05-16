"use client";

import { useState, useTransition } from "react";
import { updateMatchScore } from "@/app/actions";
import { isVolleyballSport } from "@/lib/sports";
import { toast } from "sonner";

export default function MatchForm({
  match,
  tournament,
}: {
  match: any;
  tournament: any;
}) {
  const isVolleyball = isVolleyballSport(tournament.sport);
  const maxSets = tournament.volleyballSets || 5;
  const [isPending, startTransition] = useTransition();

  const initialSets = Array.from({ length: maxSets }).map((_, i) => {
    if (
      match.setScores &&
      Array.isArray(match.setScores) &&
      match.setScores[i]
    ) {
      return {
        home: String(match.setScores[i].home ?? ""),
        away: String(match.setScores[i].away ?? ""),
      };
    }
    return { home: "", away: "" };
  });

  const [sets, setSets] = useState(initialSets);
  const [homeScore, setHomeScore] = useState(match.homeScore ?? "");
  const [awayScore, setAwayScore] = useState(match.awayScore ?? "");

  const updateSet = (index: number, team: "home" | "away", value: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [team]: value };
    setSets(newSets);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (isVolleyball) {
      const validSets = sets.filter((s) => s.home !== "" && s.away !== "");
      formData.set(
        "setScores",
        JSON.stringify(
          validSets.map((s) => ({
            home: Number(s.home),
            away: Number(s.away),
          })),
        ),
      );
      formData.delete("homeScore");
      formData.delete("awayScore");
    }

    startTransition(async () => {
      try {
        await updateMatchScore(formData);
        toast.success("Risultato aggiornato!", {
          description: `${match.homeTeam?.name} vs ${match.awayTeam?.name}`,
        });
      } catch (err: any) {
        toast.error("Errore nel salvataggio", {
          description: err?.message || "Riprova tra poco.",
        });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col md:flex-row justify-between items-center p-4 border rounded-xl transition ${
        match.status === "FINISHED"
          ? "bg-slate-50 border-slate-200"
          : "bg-white border-indigo-100 hover:border-indigo-300 shadow-sm"
      }`}
    >
      <input type="hidden" name="matchId" value={match.id} />

      <div className="flex items-center justify-between w-full md:w-auto grow max-w-2xl mx-auto mb-4 md:mb-0">
        <div
          className="text-right font-bold text-slate-700 w-1/4 truncate pr-2"
          title={match.homeTeam?.name}
        >
          {match.homeTeam?.name}
        </div>

        {isVolleyball ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex gap-2 text-xs font-semibold text-slate-400">
              {Array.from({ length: maxSets }).map((_, i) => (
                <div key={i} className="w-10 text-center">
                  S{i + 1}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: maxSets }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <input
                    id={`set-home-${match.id}-${i}`}
                    type="number"
                    value={sets[i].home}
                    onChange={(e) => updateSet(i, "home", e.target.value)}
                    min="0"
                    placeholder="-"
                    className="w-10 h-8 text-center font-bold text-sm border border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition"
                  />
                  <input
                    id={`set-away-${match.id}-${i}`}
                    type="number"
                    value={sets[i].away}
                    onChange={(e) => updateSet(i, "away", e.target.value)}
                    min="0"
                    placeholder="-"
                    className="w-10 h-8 text-center font-bold text-sm border border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mx-4 w-1/4 justify-center">
            <input
              id={`home-score-${match.id}`}
              type="number"
              name="homeScore"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              required
              min="0"
              className="w-12 h-10 text-center font-black text-lg border-2 border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
            <span className="font-bold text-slate-400">-</span>
            <input
              id={`away-score-${match.id}`}
              type="number"
              name="awayScore"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              required
              min="0"
              className="w-12 h-10 text-center font-black text-lg border-2 border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>
        )}

        <div
          className="text-left font-bold text-slate-700 w-1/4 truncate pl-2"
          title={match.awayTeam?.name}
        >
          {match.awayTeam?.name}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`px-6 py-2.5 rounded-lg font-bold shadow-sm transition w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-2 min-w-22.5 ${
          match.status === "FINISHED"
            ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="hidden sm:inline">Salvataggio...</span>
          </>
        ) : match.status === "FINISHED" ? (
          "Aggiorna"
        ) : (
          "Salva"
        )}
      </button>
    </form>
  );
}

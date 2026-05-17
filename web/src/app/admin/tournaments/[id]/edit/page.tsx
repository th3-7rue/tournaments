"use client";

import { updateTournament } from "@/app/actions";
import {
  SPORT_DISPLAY_NAMES,
  SPORT_OPTIONS,
  isVolleyballSport,
} from "@/lib/sports";
import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      id="submit-tournament"
      type="submit"
      disabled={pending}
      className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <svg
            className="animate-spin w-5 h-5 text-white"
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
          Salvataggio in corso...
        </>
      ) : (
        "Salva Modifiche"
      )}
    </button>
  );
}

export default function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState<string>("");
  const [sport, setSport] = useState("FOOTBALL");
  const [volleyballSets, setVolleyballSets] = useState(5);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [state, formAction] = useActionState(
    updateTournament,
    undefined,
    undefined,
  );

  useEffect(() => {
    if (state?.error) {
      toast.error("Errore nell'aggiornamento", { description: state.error });
    }
  }, [state]);

  // Fetch tournament data on mount and when tournamentId changes
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const resolvedParams = await params;
        setTournamentId(resolvedParams.id);
      } catch (e) {
        console.error("Error resolving params:", e);
        toast.error("Errore nel caricamento del torneo");
      }
    };
    fetchTournament();
  }, []);

  useEffect(() => {
    if (tournamentId) {
      const fetchTournament = async () => {
        try {
          const res = await fetch(`/api/admin/tournaments/${tournamentId}`);
          if (res.ok) {
            const data = await res.json();
            setSport(data.sport);
            setVolleyballSets(data.volleyballSets || 5);
            setFormData({
              name: data.name || "",
              description: data.description || "",
              format: data.format || "ROUND_ROBIN",
              startDate: data.startDate
                ? data.startDate.toISOString().split("T")[0]
                : "",
              endDate: data.endDate
                ? data.endDate.toISOString().split("T")[0]
                : "",
            });
          }
        } catch (e) {
          console.error("Error fetching tournament:", e);
          toast.error("Errore nel caricamento del torneo");
        }
      };
      fetchTournament();
    }
  }, [tournamentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = new FormData();
    for (const [key, value] of Object.entries(formData)) {
      finalData.append(key, value);
    }
    finalData.append("volleyballSets", volleyballSets.toString());
    finalData.append("tournamentId", tournamentId || "");
    formAction(finalData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          Modifica Torneo
        </h2>
        <button
          onClick={() => router.push(`/admin/tournaments/${tournamentId}`)}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
        >
          ↩ Torna ai dettagli
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        {state?.error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-start gap-2"
          >
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <span>{state.error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="tournament-name"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Nome Torneo <span className="text-red-500">*</span>
          </label>
          <input
            id="tournament-name"
            name="name"
            type="text"
            required
            maxLength={100}
            value={formData.name || ""}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Es. Coppa Estiva 2026"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Descrizione
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
            placeholder="Dettagli aggiuntivi sul torneo..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="format"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Formato <span className="text-red-500">*</span>
            </label>
            <select
              id="format"
              name="format"
              required
              value={formData.format || "ROUND_ROBIN"}
              onChange={(e) =>
                setFormData({ ...formData, format: e.target.value })
              }
              className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="ROUND_ROBIN">Gironi All'Italiana</option>
              <option value="SINGLE_ELIMINATION">Eliminazione Diretta</option>
              <option value="DOUBLE_ELIMINATION">Doppia Eliminazione</option>
              <option value="CHAMPIONS_LEAGUE">Champions League</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sport"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Sport <span className="text-red-500">*</span>
            </label>
            <select
              id="sport"
              name="sport"
              required
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              {SPORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SPORT_DISPLAY_NAMES[option]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isVolleyballSport(sport) && (
          <div>
            <label
              htmlFor="volleyballSets"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Scaglioni di Punteggio <span className="text-red-500">*</span>
            </label>
            <select
              id="volleyballSets"
              name="volleyballSets"
              required
              value={volleyballSets}
              onChange={(e) => setVolleyballSets(parseInt(e.target.value))}
              className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="3">Al meglio dei 3 (3-0, 3-1 = 3 pt, 3-2 = 2-1)</option>
              <option value="5">Al meglio dei 5 (5-0, 5-1, 5-2 = 3 pt, 5-3 = 2-1)</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Data Inizio
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate || ""}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Data Fine
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate || ""}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

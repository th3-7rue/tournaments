"use client";

import { createTournament } from "@/app/actions";
import {
  SPORT_DISPLAY_NAMES,
  SPORT_OPTIONS,
  isVolleyballSport,
} from "@/lib/sports";
import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

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
          Creazione in corso...
        </>
      ) : (
        "Salva Torneo e Continua"
      )}
    </button>
  );
}

export default function NewTournamentPage() {
  const [sport, setSport] = useState("FOOTBALL");
  const [state, formAction] = useActionState(createTournament, undefined);

  useEffect(() => {
    if (state?.error) {
      toast.error("Errore nella creazione", { description: state.error });
    }
  }, [state]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Crea Nuovo Torneo
      </h2>

      <form
        action={formAction}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5"
      >
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
            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Es. Coppa Estiva 2026"
          />
        </div>

        <div>
          <label
            htmlFor="tournament-description"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Descrizione
          </label>
          <textarea
            id="tournament-description"
            name="description"
            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            rows={3}
            placeholder="Dettagli aggiuntivi..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="tournament-sport"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Sport
            </label>
            <select
              id="tournament-sport"
              name="sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {SPORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SPORT_DISPLAY_NAMES[option]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="tournament-format"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Formato
            </label>
            <select
              id="tournament-format"
              name="format"
              className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ROUND_ROBIN">Gironi (All&apos;italiana)</option>
              <option value="SINGLE_ELIMINATION">Eliminazione Diretta</option>
              <option value="DOUBLE_ELIMINATION">Doppia Eliminazione</option>
              <option value="CHAMPIONS_LEAGUE">Champions League (Misto)</option>
            </select>
          </div>
        </div>

        {isVolleyballSport(sport) && (
          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 animate-in fade-in duration-200">
            <h3 className="font-bold text-indigo-900 mb-3">
              🏐 Impostazioni Volley
            </h3>
            <div>
              <label
                htmlFor="volleyball-sets"
                className="block text-sm font-semibold text-indigo-800 mb-2"
              >
                Formato Set
              </label>
              <select
                id="volleyball-sets"
                name="volleyballSets"
                className="w-full border border-indigo-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="3">
                  Al meglio dei 3 set (vince chi arriva a 2)
                </option>
                <option value="5">
                  Al meglio dei 5 set (vince chi arriva a 3)
                </option>
              </select>
            </div>
          </div>
        )}

        <div className="pt-6 border-t mt-4">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

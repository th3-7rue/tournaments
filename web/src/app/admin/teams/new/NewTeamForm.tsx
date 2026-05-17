"use client"

import { createTeam } from "@/app/actions"
import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      id="submit-team"
      type="submit"
      disabled={disabled || pending}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Aggiunta in corso...
        </>
      ) : "Aggiungi Squadra"}
    </button>
  )
}

interface Group {
  id: string;
  name: string;
}

export default function NewTeamForm({ 
  tournaments, 
  groups 
}: { 
  tournaments: { id: string; name: string }[];
  groups?: Group[]
}) {
  const searchParams = useSearchParams()
  const [state, formAction] = useActionState(createTeam, undefined)
  const [selectedGroup, setSelectedGroup] = useState<string>(searchParams.get("group") || "")

  useEffect(() => {
    if (state?.error) {
      toast.error("Errore", { description: state.error })
    }
  }, [state])

  return (
    <form action={formAction} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
      {state?.error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="team-name" className="block text-sm font-semibold text-slate-700 mb-2">
          Nome Squadra <span className="text-red-500">*</span>
        </label>
        <input
          id="team-name"
          name="name"
          type="text"
          required
          maxLength={50}
          className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          placeholder="Es. FC Real Milan"
        />
      </div>

      <div>
        <label htmlFor="team-tournament" className="block text-sm font-semibold text-slate-700 mb-2">
          Seleziona Torneo <span className="text-red-500">*</span>
        </label>
        {tournaments.length > 0 ? (
          <select
            id="team-tournament"
            name="tournamentId"
            required
            className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-- Scegli un torneo --</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
            Devi prima creare un torneo per poter aggiungere delle squadre.{" "}
            <Link href="/admin/tournaments/new" className="font-bold underline ml-1">Crea Torneo</Link>
          </div>
        )}
      </div>

      {groups && groups.length > 0 && (
        <div>
          <label htmlFor="team-group" className="block text-sm font-semibold text-slate-700 mb-2">
            Seleziona Girone (opzionale)
          </label>
          <select
            id="team-group"
            name="groupId"
            defaultValue={selectedGroup}
            className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-- Nessun Girone --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="pt-6 border-t mt-4">
        <SubmitButton disabled={tournaments.length === 0} />
      </div>
    </form>
  )
}

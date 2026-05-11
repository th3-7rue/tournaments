import { createTeam } from "@/app/actions"
import { PrismaClient } from "@prisma/client"
import Link from "next/link"

const prisma = new PrismaClient()

export default async function NewTeamPage() {
  const tournaments = await prisma.tournament.findMany()

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Aggiungi Nuova Squadra</h2>
      <form action={createTeam} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Squadra *</label>
          <input name="name" type="text" required className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Es. FC Real Milan"/>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Seleziona Torneo *</label>
          {tournaments.length > 0 ? (
            <select name="tournamentId" required className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">-- Scegli un torneo --</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
             <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
               Devi prima creare un torneo per poter aggiungere delle squadre. 
               <Link href="/admin/tournaments/new" className="font-bold underline ml-1">Crea Torneo</Link>
             </div>
          )}
        </div>
        <div className="pt-6 border-t mt-4">
          <button type="submit" disabled={tournaments.length === 0} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed">
            Aggiungi Squadra
          </button>
        </div>
      </form>
    </div>
  )
}

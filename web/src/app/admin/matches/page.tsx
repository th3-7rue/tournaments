import { PrismaClient } from "@prisma/client"
import { updateMatchScore } from "@/app/actions"
import MatchForm from "./MatchForm"

const prisma = new PrismaClient()

export default async function AdminMatchesPage() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: { in: ['ONGOING', 'COMPLETED'] } },
    include: {
      matches: {
        include: { homeTeam: true, awayTeam: true },
        orderBy: { matchDate: "asc" }
      }
    }
  });

  if (tournaments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-5xl mb-4">⚽</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nessun torneo in corso</h2>
        <p className="text-slate-500">Per inserire i risultati, devi prima generare il calendario di un torneo dalla sua pagina di dettaglio.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Risultati Partite</h1>
        <p className="text-slate-500">Aggiorna i risultati in tempo reale. Le classifiche si ricalcoleranno automaticamente.</p>
      </div>

      {tournaments.map(tournament => (
        <div key={tournament.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">{tournament.name}</h2>
            <span className="text-xs font-semibold bg-indigo-500/30 text-indigo-100 px-3 py-1 rounded-full">{tournament.sport}</span>
          </div>
          
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {tournament.matches.length === 0 ? (
              <p className="text-slate-500 italic">Nessuna partita generata.</p>
            ) : (
              tournament.matches.map((m: any) => (
                <MatchForm key={m.id} match={m} tournament={tournament} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

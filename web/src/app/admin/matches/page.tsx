import { PrismaClient } from "@prisma/client"
import { updateMatchScore } from "@/app/actions"

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
                <form key={m.id} action={updateMatchScore} className={`flex flex-col md:flex-row justify-between items-center p-4 border rounded-xl transition ${m.status === 'FINISHED' ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-100 hover:border-indigo-300 shadow-sm'}`}>
                  <input type="hidden" name="matchId" value={m.id} />
                  
                  <div className="flex items-center justify-between w-full md:w-auto flex-grow max-w-md mx-auto mb-4 md:mb-0">
                    <div className="text-right font-bold text-slate-700 w-2/5 truncate" title={m.homeTeam?.name}>{m.homeTeam?.name}</div>
                    
                    <div className="flex items-center gap-2 mx-4 w-1/5 justify-center">
                      <input 
                        type="number" 
                        name="homeScore" 
                        defaultValue={m.homeScore ?? ''} 
                        required 
                        min="0"
                        className="w-12 h-10 text-center font-black text-lg border-2 border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                      />
                      <span className="font-bold text-slate-400">-</span>
                      <input 
                        type="number" 
                        name="awayScore" 
                        defaultValue={m.awayScore ?? ''} 
                        required 
                        min="0"
                        className="w-12 h-10 text-center font-black text-lg border-2 border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                      />
                    </div>
                    
                    <div className="text-left font-bold text-slate-700 w-2/5 truncate" title={m.awayTeam?.name}>{m.awayTeam?.name}</div>
                  </div>

                  <button 
                    type="submit" 
                    className={`px-6 py-2.5 rounded-lg font-bold shadow-sm transition w-full md:w-auto ${m.status === 'FINISHED' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    {m.status === 'FINISHED' ? 'Aggiorna' : 'Salva'}
                  </button>
                </form>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

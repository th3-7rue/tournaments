import prisma from "@/lib/prisma"
import Link from "next/link"

export default async function Home() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { teams: true, matches: true }
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8">
      <header className="mb-12 text-center mt-12">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-4 tracking-tight pb-2">LiveCup 🏆</h1>
        <p className="text-xl text-slate-500 font-medium">I tuoi tornei, in tempo reale.</p>
      </header>

      <main className="w-full max-w-6xl">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Tornei Recenti</h2>
        </div>
        
        {tournaments.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-lg">Non ci sono tornei attivi al momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournament/${t.id}`} className="group block">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : t.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {t.status === 'DRAFT' ? 'Iscrizioni' : t.status === 'ONGOING' ? 'In Corso' : 'Terminato'}
                      </span>
                      <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">{t.sport}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition mb-2">{t.name}</h3>
                    {t.description && <p className="text-slate-500 text-sm line-clamp-2 mb-4">{t.description}</p>}
                  </div>
                  
                  <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-1">🛡️ {t._count.teams}</div>
                    <div className="flex items-center gap-1">⚽ {t._count.matches}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      
      <footer className="mt-auto pt-16 pb-8 text-center text-sm text-slate-400">
        <Link href="/admin/login" className="hover:text-indigo-500 transition font-semibold">Accesso Amministratore →</Link>
      </footer>
    </div>
  );
}

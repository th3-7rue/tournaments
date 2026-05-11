import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminDashboard() {
  const session = await getServerSession()

  if (!session) {
    redirect("/admin/login")
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard Overview</h2>
        <Link href="/admin/tournaments/new" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
          + Nuovo Torneo
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">Gestione Tornei</h3>
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">Crea e configura i tuoi tornei, scegli lo sport, il formato (Eliminazione Diretta, Gironi) e molto altro.</p>
          <Link href="/admin/tournaments" className="block text-center bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full hover:bg-slate-800 transition">Vai ai Tornei</Link>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">Squadre & Iscritti</h3>
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">Gestisci l'anagrafica delle squadre, i giocatori, le rose e controlla lo stato delle iscrizioni.</p>
          <Link href="/admin/teams" className="block text-center bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full hover:bg-slate-800 transition">Gestisci Squadre</Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">Aggiorna Risultati</h3>
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">Inserisci i risultati in tempo reale. Le classifiche e i tabelloni si aggiorneranno automaticamente.</p>
          <button className="bg-rose-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium w-full hover:bg-rose-700 transition">Risultati Live (Presto)</button>
        </div>
      </div>
    </div>
  )
}

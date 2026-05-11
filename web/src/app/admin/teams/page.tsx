import prisma from "@/lib/prisma"
import Link from "next/link"

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { tournament: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Le tue Squadre</h2>
        <Link href="/admin/teams/new" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium">
          + Aggiungi Squadra
        </Link>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
            <tr>
              <th className="p-4">Nome Squadra</th>
              <th className="p-4">Torneo Iscritto</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr><td colSpan={2} className="p-8 text-center text-slate-500">Nessuna squadra inserita. Vai ad aggiungerne una!</td></tr>
            ) : teams.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                <td className="p-4 font-semibold text-slate-800">{t.name}</td>
                <td className="p-4 text-slate-600">{t.tournament.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import prisma from "@/lib/prisma";
import Link from "next/link";
import { SPORT_DISPLAY_NAMES } from "@/lib/sports";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true, matches: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">I tuoi Tornei</h2>
        <Link
          href="/admin/tournaments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium"
        >
          + Crea Torneo
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Sport</th>
              <th className="p-4">Formato</th>
              <th className="p-4 text-center">Squadre Iscritte</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Nessun torneo creato. Inizia creandone uno!
                </td>
              </tr>
            ) : (
              tournaments.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition"
                >
                  <td className="p-4 font-semibold text-slate-800">
                    <Link
                      href={`/admin/tournaments/${t.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-600">
                    {SPORT_DISPLAY_NAMES[
                      t.sport as keyof typeof SPORT_DISPLAY_NAMES
                    ] ?? t.sport}
                  </td>
                  <td className="p-4 text-slate-600">
                    {t.format.replace("_", " ")}
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600">
                    {t._count.teams}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/tournaments/${t.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Modifica
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

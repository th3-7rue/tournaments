import prisma from "@/lib/prisma";
import { CreateGroupSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  _count: { teams: number };
  teams: {
    id: string;
    name: string;
  }[];
}

export const dynamic = "force-dynamic";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          teams: {
            select: { id: true, name: true },
          },
          _count: { select: { teams: true } },
        },
      },
      teams: {
        include: { group: true },
      },
    },
  });

  if (!tournament) return <div>Torneo non trovato</div>;

  const teams = tournament.teams;
  const groups = tournament.groups;

  // Generate group names if needed (A, B, C, etc.)
  const suggestedGroupNames = Array.from(
    { length: Math.ceil(teams.length / 4) },
    (_, i) => `Girone ${String.fromCharCode(65 + i)}`
  );

  // Teams not yet assigned to any group
  const unassignedTeams = teams.filter((t) => t.group === null);
  const assignedTeams = teams.filter((t) => t.group !== null);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">
              Gestione Gironi
            </h1>
            <p className="text-slate-500 mt-2">
              Organizza le squadre in gironi per il formato {tournament.format.replace("_", " ")}
            </p>
          </div>
          <Link
            href={`/admin/tournaments/${id}`}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            ← Torna al torneo
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 font-medium">Squadre Totali</div>
          <div className="text-4xl font-bold text-slate-800 mt-2">
            {teams.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 font-medium">Gironi</div>
          <div className="text-4xl font-bold text-slate-800 mt-2">
            {groups.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 font-medium">Squadre Non Assegnate</div>
          <div className="text-4xl font-bold text-amber-600 mt-2">
            {unassignedTeams.length}
          </div>
        </div>
      </div>

      {/* Actions Section */}
      {tournament.status === "DRAFT" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Azioni Rapide
          </h2>
          <div className="flex flex-wrap gap-4">
            {/* Create Group */}
            <form
              action={async (formData) => {
                "use server";
                const validated = CreateGroupSchema.safeParse({
                  name: formData.get("name"),
                  tournamentId: id,
                });
                if (!validated.success) return;
                await prisma.group.create({
                  data: {
                    name: validated.data.name,
                    tournamentId: validated.data.tournamentId,
                  },
                });
                revalidatePath(`/admin/tournaments/${id}/groups`);
                redirect(`/admin/tournaments/${id}/groups`);
              }}
              className="flex-1 min-w-[250px] space-y-3"
            >
              <label htmlFor="group-name" className="text-sm font-semibold text-slate-700">
                Nuovo Girone
              </label>
              <input
                id="group-name"
                name="name"
                type="text"
                required
                defaultValue={suggestedGroupNames[groups.length]}
                maxLength={50}
                className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Es. Girone A"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                + Crea Girone
              </button>
            </form>

            {/* Auto-distribute Teams */}
            {unassignedTeams.length > 0 && groups.length > 0 && (
              <form
                action={async (formData) => {
                  "use server";
                  await prisma.team.updateMany({
                    where: { tournamentId: id, groupId: null },
                    data: {
                      groupId: (
                        Math.floor(
                          Math.random() * groups.length
                        ) + 1
                      ).toString(),
                    },
                  });
                  revalidatePath(`/admin/tournaments/${id}/groups`);
                  redirect(`/admin/tournaments/${id}/groups`);
                }}
                className="flex-1 min-w-[250px] space-y-3"
              >
                <label className="text-sm font-semibold text-slate-700">
                  Distribuzione Automatica
                </label>
                <p className="text-sm text-slate-500">
                  Assegna le {unassignedTeams.length} squadre non assegnate ai gironi in modo casuale
                </p>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition"
                >
                  Distribuisce Casualmente
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Nessun Girone Creato
          </h3>
          <p className="text-slate-500 mb-6">
            Crea un nuovo girone per organizzare le squadre o usa la distribuzione automatica
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href={`/admin/tournaments/${id}/groups?create=true`}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Crea il Primo Girone
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {group.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {group._count.teams} squadra{group._count.teams !== 1 ? "e" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {tournament.status === "DRAFT" && (
                    <form
                      action={async (formData) => {
                        "use server";
                        await prisma.team.updateMany({
                          where: {
                            tournamentId: id,
                            groupId: group.id,
                          },
                          data: { groupId: null },
                        });
                        revalidatePath(`/admin/tournaments/${id}/groups`);
                        redirect(`/admin/tournaments/${id}/groups`);
                      }}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Svuota Girone"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </form>
                  )}
                  <form
                    action={async (formData) => {
                      "use server";
                      await prisma.group.delete({ where: { id: group.id } });
                      revalidatePath(`/admin/tournaments/${id}/groups`);
                      redirect(`/admin/tournaments/${id}`);
                    }}
                    className="inline"
                  >
                    <button
                      type="submit"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Elimina Girone"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              {/* Teams in Group */}
              {group.teams.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-sm italic">
                    Nessuna squadra
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {group.teams.map((team) => (
                    <li
                      key={team.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3"
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs"
                        title={team.name}
                      >
                        {team.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700 flex-1">
                        {team.name}
                      </span>
                      {tournament.status === "DRAFT" && (
                        <form
                          action={async (formData) => {
                            "use server";
                            await prisma.team.update({
                              where: { id: team.id },
                              data: { groupId: null },
                            });
                            revalidatePath(`/admin/tournaments/${id}/groups`);
                            redirect(`/admin/tournaments/${id}/groups`);
                          }}
                          className="inline"
                        >
                          <button
                            type="submit"
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                            title="Rimuovi da Girone"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import prisma from "@/lib/prisma";
import NewTeamForm from "./NewTeamForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: "DRAFT" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Aggiungi Nuova Squadra
      </h2>
      {tournaments.length === 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
          Nessun torneo modificabile disponibile. I tornei in corso o completati
          non accettano nuove squadre.{" "}
          <Link href="/admin/tournaments" className="font-bold underline">
            Vai ai tornei
          </Link>
        </div>
      )}
      <NewTeamForm tournaments={tournaments} />
    </div>
  );
}

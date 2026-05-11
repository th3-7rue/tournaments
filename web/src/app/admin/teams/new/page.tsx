import prisma from "@/lib/prisma"
import NewTeamForm from "./NewTeamForm"

export default async function NewTeamPage() {
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true }
  })

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Aggiungi Nuova Squadra</h2>
      <NewTeamForm tournaments={tournaments} />
    </div>
  )
}

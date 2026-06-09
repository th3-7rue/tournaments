"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Props {
  teamId: string
  teamName: string
  tournamentId: string
  tournamentName: string
  onDeleted?: () => void
}

export default function DeleteTeamButton({ teamId, teamName, tournamentId, tournamentName, onDeleted }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (
      !confirm(
        `Sei sicuro di voler cancellare "${teamName}" da ${tournamentName}? Tutte le partite associate verranno eliminate.`,
      )
    )
      return

    setIsDeleting(true)
    try {
      const res = await fetch("/api/delete-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || "Errore nella cancellazione")
      
      toast.success("Squadra eliminata")
      if (onDeleted) onDeleted()
      // Refresh the page or navigate to update UI
      router.refresh()
    } catch (e: any) {
      toast.error("Eliminazione fallita", { description: e.message || e })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition disabled:opacity-70 font-medium"
    >
      {isDeleting ? "Eliminazione..." : "Elimina"}
    </button>
  )
}

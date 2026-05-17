"use client"

import React from "react"

interface Props {
  tournamentId: string
}

export default function DeleteTournamentButton({ tournamentId }: Props) {
  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler cancellare il torneo? Questa operazione è irreversibile.")) return

    try {
      const res = await fetch('/api/delete-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Errore nella cancellazione')
      // Redirect alla lista tornei
      window.location.href = '/admin/tournaments'
    } catch (e: any) {
      alert('Cancellazione fallita: ' + (e.message || e))
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition font-medium"
    >
      Elimina Torneo
    </button>
  )
}

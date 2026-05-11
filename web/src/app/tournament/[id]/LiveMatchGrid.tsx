"use client"

import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import type { SetScore } from "@/lib/scoring"

interface LiveMatch {
  id: string
  homeTeam?: { name: string } | null
  awayTeam?: { name: string } | null
  homeScore: number | null
  awayScore: number | null
  status: string
  setScores?: any
}

interface LivePointPayload {
  matchId: string
  homeCurrentPoints: number
  awayCurrentPoints: number
  homeSetsWon: number
  awaySetsWon: number
  completedSets: SetScore[]
  status: string
}

interface Props {
  tournamentId: string
  initialMatches: LiveMatch[]
}

export default function LiveMatchGrid({ tournamentId, initialMatches }: Props) {
  const [matches, setMatches] = useState<LiveMatch[]>(initialMatches)
  const [liveScores, setLiveScores] = useState<Record<string, LivePointPayload>>({})
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(window.location.origin)
    socketRef.current = socket

    // Entra nella room del torneo per ricevere aggiornamenti
    socket.emit("join-tournament", tournamentId)

    // Aggiornamento in tempo reale punto per punto
    socket.on("live-point", (data: LivePointPayload) => {
      setLiveScores(prev => ({ ...prev, [data.matchId]: data }))
    })

    // Quando la partita è terminata e salvata nel DB, aggiorna i dati
    socket.on("score-updated", () => {
      // Refresh leggero della pagina solo al termine della partita
      window.location.reload()
    })

    return () => { socket.disconnect() }
  }, [tournamentId])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map(m => {
        const live = liveScores[m.id]
        const isLive = live != null || m.status === 'LIVE'

        // Mostra il punteggio live se disponibile, altrimenti quello dal DB
        const homeDisplay = live != null ? live.homeCurrentPoints : (m.homeScore ?? null)
        const awayDisplay = live != null ? live.awayCurrentPoints : (m.awayScore ?? null)
        const isFinished = m.status === 'FINISHED' && live == null

        // Set completati: prendi dal live payload se disponibile
        const setScores: SetScore[] = live?.completedSets ?? (m.setScores as SetScore[] | null) ?? []

        return (
          <div
            key={m.id}
            className={`flex items-center justify-between p-4 rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-md ${
              isFinished
                ? 'bg-white border-indigo-100 shadow-sm'
                : isLive
                  ? 'bg-white border-red-200 shadow-sm ring-1 ring-red-200'
                  : 'bg-white border-slate-200'
            }`}
          >
            <div className="font-bold text-slate-700 w-2/5 text-right truncate" title={m.homeTeam?.name}>
              {m.homeTeam?.name}
            </div>

            <div className="w-1/5 flex flex-col justify-center items-center gap-1">
              <div className={`px-3 py-1.5 rounded-lg text-center min-w-[70px] font-black tracking-wider text-sm shadow-sm transition-all ${
                isFinished
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                  : isLive
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {homeDisplay != null && awayDisplay != null
                  ? `${homeDisplay} – ${awayDisplay}`
                  : 'VS'}
              </div>

              {/* Live indicator */}
              {isLive && (
                <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                  LIVE
                </div>
              )}

              {/* Set scores */}
              {setScores.length > 0 && (isFinished || isLive) && (
                <div className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  {setScores.map((s: SetScore) => `${s.home}-${s.away}`).join(' ')}
                </div>
              )}
            </div>

            <div className="font-bold text-slate-700 w-2/5 text-left truncate" title={m.awayTeam?.name}>
              {m.awayTeam?.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { updateMatchScore, startMatch } from "@/app/actions"
import {
  SPORT_CONFIGS,
  calculateSetsWon,
  type SetScore,
  type Sport,
} from "@/lib/scoring"
import Link from "next/link"

interface LiveScorerProps {
  matchId: string
  tournamentId: string
  sport: Sport
  maxSets: number
  homeName: string
  awayName: string
  initialSetScores: SetScore[]
  initialHomeScore: number
  initialAwayScore: number
  initialStatus: string
}

export default function LiveScorer({
  matchId,
  tournamentId,
  sport,
  maxSets,
  homeName,
  awayName,
  initialSetScores,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
}: LiveScorerProps) {
  const config = SPORT_CONFIGS[sport] ?? SPORT_CONFIGS.CUSTOM
  const hasSets = config.hasSets

  // ✅ Unico oggetto di stato per i punti del set corrente — evita il bug di setState annidati
  const [currentPoints, setCurrentPoints] = useState({ home: 0, away: 0 })

  // Set completati (solo per sport con set)
  const [completedSets, setCompletedSets] = useState<SetScore[]>(initialSetScores)

  // Per sport senza set: punteggio totale (unico oggetto)
  const [totalScore, setTotalScore] = useState({ home: initialHomeScore, away: initialAwayScore })

  const [isSaving, setIsSaving] = useState(false)
  const [isFinished, setIsFinished] = useState(initialStatus === 'FINISHED')
  const [isStarted, setIsStarted] = useState(initialStatus === 'LIVE' || initialStatus === 'FINISHED')
  const socketRef = useRef<Socket | null>(null)

  const { home: homeSetsWon, away: awaySetsWon } = calculateSetsWon(completedSets)
  const currentSet = completedSets.length + 1

  const setTarget = hasSets ? config.setTarget(currentSet, maxSets) : 0
  const shouldEnd = hasSets && config.shouldEndSet(currentPoints.home, currentPoints.away, currentSet, maxSets)
  const matchOver = hasSets ? config.isMatchOver(completedSets, maxSets) : false

  // Socket.io connection
  useEffect(() => {
    const socket = io(window.location.origin)
    socketRef.current = socket
    socket.emit("join-match", matchId)
    return () => { socket.disconnect() }
  }, [matchId])

  // Emette il punteggio corrente via Socket.io
  const emitLivePoint = useCallback((
    hp: number, ap: number,
    sets: SetScore[]
  ) => {
    const { home: hsw, away: asw } = calculateSetsWon(sets)
    socketRef.current?.emit("live-point", {
      matchId,
      tournamentId,
      sport,
      homeName,
      awayName,
      homeCurrentPoints: hp,
      awayCurrentPoints: ap,
      homeSetsWon: hsw,
      awaySetsWon: asw,
      currentSet: sets.length + 1,
      completedSets: sets,
      status: 'LIVE',
    })
  }, [matchId, tournamentId, sport, homeName, awayName])

  // Vibrazione haptic su mobile
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  // ✅ Aggiorna UN SOLO oggetto di stato atomicamente — niente setState annidati
  const addPoint = useCallback((team: 'home' | 'away') => {
    vibrate(30)
    if (hasSets) {
      setCurrentPoints(prev => {
        const next = { ...prev, [team]: prev[team] + 1 }
        emitLivePoint(next.home, next.away, completedSets)
        return next
      })
    } else {
      setTotalScore(prev => {
        const next = { ...prev, [team]: prev[team] + 1 }
        emitLivePoint(next.home, next.away, [])
        return next
      })
    }
  }, [hasSets, completedSets, emitLivePoint, vibrate])

  const removePoint = useCallback((team: 'home' | 'away') => {
    vibrate([10, 10, 10])
    if (hasSets) {
      setCurrentPoints(prev => {
        if (prev[team] === 0) return prev
        const next = { ...prev, [team]: prev[team] - 1 }
        emitLivePoint(next.home, next.away, completedSets)
        return next
      })
    } else {
      setTotalScore(prev => {
        if (prev[team] === 0) return prev
        const next = { ...prev, [team]: prev[team] - 1 }
        emitLivePoint(next.home, next.away, [])
        return next
      })
    }
  }, [hasSets, completedSets, emitLivePoint, vibrate])

  const closeSet = useCallback(() => {
    vibrate([50, 30, 50])
    const newSet: SetScore = { home: currentPoints.home, away: currentPoints.away }
    const newSets = [...completedSets, newSet]
    setCompletedSets(newSets)
    setCurrentPoints({ home: 0, away: 0 })
    emitLivePoint(0, 0, newSets)
  }, [currentPoints, completedSets, emitLivePoint, vibrate])

  const handleStart = async () => {
    try {
      await startMatch(matchId)
      setIsStarted(true)
      toast.success("Partita iniziata! 🏆")
    } catch (e: any) {
      toast.error("Errore nell'avvio", { description: e.message })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.set('matchId', matchId)
      if (hasSets) {
        const allSets = currentPoints.home > 0 || currentPoints.away > 0
          ? [...completedSets, { home: currentPoints.home, away: currentPoints.away }]
          : completedSets
        formData.set('setScores', JSON.stringify(allSets))
      } else {
        formData.set('homeScore', String(totalScore.home))
        formData.set('awayScore', String(totalScore.away))
      }
      await updateMatchScore(formData)
      setIsFinished(true)
      socketRef.current?.emit("score-update", { matchId, tournamentId })
      toast.success("Risultato salvato! ✅")
      vibrate([100, 50, 100])
    } catch (e: any) {
      toast.error("Errore nel salvataggio", { description: e.message })
    } finally {
      setIsSaving(false)
    }
  }

  // --- UI helpers ---
  const setDots = (won: number, total: number) =>
    Array.from({ length: Math.ceil(total / 2) }).map((_, i) => (
      <div
        key={i}
        className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
          i < won ? 'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'bg-transparent border-white/40'
        }`}
      />
    ))

  const homeDisplay = hasSets ? currentPoints.home : totalScore.home
  const awayDisplay = hasSets ? currentPoints.away : totalScore.away
  const homeCanRemove = hasSets ? currentPoints.home > 0 : totalScore.home > 0
  const awayCanRemove = hasSets ? currentPoints.away > 0 : totalScore.away > 0

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden select-none touch-manipulation">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2 shrink-0">
        <Link
          href="/admin/matches"
          className="text-slate-400 hover:text-white transition p-2 -ml-2"
          aria-label="Torna alle partite"
        >
          ← Esci
        </Link>
        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="text-emerald-400 font-bold text-sm tracking-widest">TERMINATA ✓</span>
          ) : isStarted ? (
            <span className="flex items-center gap-1.5 text-red-400 font-bold text-sm tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="text-slate-500 font-bold text-sm tracking-widest">PRONTA</span>
          )}
        </div>
        {hasSets && (
          <div className="text-slate-400 text-sm font-semibold">
            {config.setLabel} {currentSet}/{maxSets}
          </div>
        )}
      </div>

      {/* Team names + set dots */}
      <div className="grid grid-cols-2 px-4 gap-2 shrink-0 pb-1">
        <div className="text-center">
          <div className="text-white font-black text-lg truncate px-1">{homeName}</div>
          {hasSets && (
            <div className="flex justify-center gap-1.5 mt-1.5">
              {setDots(homeSetsWon, maxSets)}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-white font-black text-lg truncate px-1">{awayName}</div>
          {hasSets && (
            <div className="flex justify-center gap-1.5 mt-1.5">
              {setDots(awaySetsWon, maxSets)}
            </div>
          )}
        </div>
      </div>

      {/* MAIN SCORE */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full px-4 gap-3">
          <div className="text-center">
            <div className={`font-black tabular-nums transition-all duration-150 ${
              hasSets ? 'text-[5rem] sm:text-[7rem]' : 'text-[4.5rem] sm:text-[6rem]'
            } leading-none text-white`}>
              {homeDisplay}
            </div>
          </div>

          <div className="text-slate-500 font-bold text-4xl">-</div>

          <div className="text-center">
            <div className={`font-black tabular-nums transition-all duration-150 ${
              hasSets ? 'text-[5rem] sm:text-[7rem]' : 'text-[4.5rem] sm:text-[6rem]'
            } leading-none text-white`}>
              {awayDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* Set target indicator */}
      {hasSets && !isFinished && (
        <div className="text-center text-slate-500 text-sm pb-2 shrink-0">
          {config.pointLabel} per vincere: <span className="text-slate-300 font-bold">{setTarget}</span>
          {shouldEnd && (
            <span className="ml-2 text-amber-400 font-bold animate-pulse">• Fine set!</span>
          )}
        </div>
      )}

      {/* Completed sets summary */}
      {hasSets && completedSets.length > 0 && (
        <div className="flex justify-center gap-2 pb-2 shrink-0 flex-wrap px-4">
          {completedSets.map((s, i) => (
            <div key={i} className="text-xs text-slate-500 bg-slate-800 rounded-lg px-2.5 py-1 font-mono">
              S{i + 1}:{' '}
              <span className={s.home > s.away ? 'text-emerald-400' : 'text-slate-300'}>{s.home}</span>
              {' - '}
              <span className={s.away > s.home ? 'text-emerald-400' : 'text-slate-300'}>{s.away}</span>
            </div>
          ))}
        </div>
      )}

      {/* +1 / -1 buttons */}
      {!isFinished && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-3 shrink-0">
          {/* HOME */}
          <div className="flex flex-col gap-2">
            <button
              id="btn-home-plus"
              onPointerDown={() => addPoint('home')}
              disabled={!isStarted || matchOver}
              className="w-full h-20 bg-indigo-600 active:bg-indigo-700 active:scale-95 text-white font-black text-3xl rounded-2xl shadow-lg transition-transform duration-75 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label={`+1 ${homeName}`}
            >
              +1
            </button>
            <button
              id="btn-home-minus"
              onPointerDown={() => removePoint('home')}
              disabled={!isStarted || matchOver || !homeCanRemove}
              className="w-full h-10 bg-slate-700 active:bg-slate-600 active:scale-95 text-slate-300 font-bold text-lg rounded-xl transition-transform duration-75 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={`-1 ${homeName}`}
            >
              -1
            </button>
          </div>

          {/* AWAY */}
          <div className="flex flex-col gap-2">
            <button
              id="btn-away-plus"
              onPointerDown={() => addPoint('away')}
              disabled={!isStarted || matchOver}
              className="w-full h-20 bg-rose-600 active:bg-rose-700 active:scale-95 text-white font-black text-3xl rounded-2xl shadow-lg transition-transform duration-75 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label={`+1 ${awayName}`}
            >
              +1
            </button>
            <button
              id="btn-away-minus"
              onPointerDown={() => removePoint('away')}
              disabled={!isStarted || matchOver || !awayCanRemove}
              className="w-full h-10 bg-slate-700 active:bg-slate-600 active:scale-95 text-slate-300 font-bold text-lg rounded-xl transition-transform duration-75 disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label={`-1 ${awayName}`}
            >
              -1
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pb-safe pb-6 shrink-0 space-y-3">
        {!isStarted && !isFinished && (
          <button
            id="btn-start"
            onClick={handleStart}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xl rounded-2xl shadow-xl transition"
          >
            🏁 Inizia Partita
          </button>
        )}

        {isStarted && !isFinished && hasSets && shouldEnd && !matchOver && (
          <button
            id="btn-close-set"
            onClick={closeSet}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-white font-black text-xl rounded-2xl shadow-xl transition animate-pulse"
          >
            ✓ Chiudi Set {currentSet}
          </button>
        )}

        {isStarted && !isFinished && matchOver && (
          <button
            id="btn-finish"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xl rounded-2xl shadow-xl transition disabled:opacity-60"
          >
            {isSaving ? "Salvataggio..." : "🏆 Termina Partita"}
          </button>
        )}

        {isStarted && !isFinished && !hasSets && (
          <button
            id="btn-save-football"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-base rounded-xl transition disabled:opacity-60"
          >
            {isSaving ? "Salvataggio..." : "💾 Salva risultato finale"}
          </button>
        )}

        {isFinished && (
          <Link
            href="/admin/matches"
            className="block w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-2xl text-center transition"
          >
            ← Torna alle Partite
          </Link>
        )}
      </div>
    </div>
  )
}

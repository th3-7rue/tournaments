"use client"

import { useState } from "react"
import { updateMatchScore } from "@/app/actions"

export default function MatchForm({ match, tournament }: { match: any, tournament: any }) {
  const isVolleyball = tournament.sport === 'VOLLEYBALL';
  const maxSets = tournament.volleyballSets || 5;
  
  // Per la pallavolo gestiamo lo stato dei set
  const initialSets = Array.from({ length: maxSets }).map((_, i) => {
    if (match.setScores && Array.isArray(match.setScores) && match.setScores[i]) {
      return { home: match.setScores[i].home || '', away: match.setScores[i].away || '' };
    }
    return { home: '', away: '' };
  });

  const [sets, setSets] = useState(initialSets);

  const updateSet = (index: number, team: 'home' | 'away', value: string) => {
    const newSets = [...sets];
    newSets[index][team] = value;
    setSets(newSets);
  };

  return (
    <form action={updateMatchScore} className={`flex flex-col md:flex-row justify-between items-center p-4 border rounded-xl transition ${match.status === 'FINISHED' ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-100 hover:border-indigo-300 shadow-sm'}`}>
      <input type="hidden" name="matchId" value={match.id} />
      
      {isVolleyball && (
        <input 
          type="hidden" 
          name="setScores" 
          value={JSON.stringify(sets.filter(s => s.home !== '' && s.away !== '').map(s => ({ home: Number(s.home), away: Number(s.away) })))} 
        />
      )}
      
      <div className="flex items-center justify-between w-full md:w-auto flex-grow max-w-2xl mx-auto mb-4 md:mb-0">
        <div className="text-right font-bold text-slate-700 w-1/4 truncate pr-2" title={match.homeTeam?.name}>{match.homeTeam?.name}</div>
        
        {isVolleyball ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex gap-2 text-xs font-semibold text-slate-400">
              {Array.from({ length: maxSets }).map((_, i) => (
                <div key={i} className="w-10 text-center">Set {i+1}</div>
              ))}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: maxSets }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <input 
                    type="number" 
                    value={sets[i].home}
                    onChange={(e) => updateSet(i, 'home', e.target.value)}
                    min="0"
                    className="w-10 h-8 text-center font-bold text-sm border border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition"
                  />
                  <input 
                    type="number" 
                    value={sets[i].away}
                    onChange={(e) => updateSet(i, 'away', e.target.value)}
                    min="0"
                    className="w-10 h-8 text-center font-bold text-sm border border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mx-4 w-1/4 justify-center">
            <input 
              type="number" 
              name="homeScore" 
              defaultValue={match.homeScore ?? ''} 
              required 
              min="0"
              className="w-12 h-10 text-center font-black text-lg border-2 border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
            <span className="font-bold text-slate-400">-</span>
            <input 
              type="number" 
              name="awayScore" 
              defaultValue={match.awayScore ?? ''} 
              required 
              min="0"
              className="w-12 h-10 text-center font-black text-lg border-2 border-slate-300 rounded bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>
        )}
        
        <div className="text-left font-bold text-slate-700 w-1/4 truncate pl-2" title={match.awayTeam?.name}>{match.awayTeam?.name}</div>
      </div>

      <button 
        type="submit" 
        className={`px-6 py-2.5 rounded-lg font-bold shadow-sm transition w-full md:w-auto mt-4 md:mt-0 ${match.status === 'FINISHED' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
      >
        {match.status === 'FINISHED' ? 'Aggiorna' : 'Salva'}
      </button>
    </form>
  )
}

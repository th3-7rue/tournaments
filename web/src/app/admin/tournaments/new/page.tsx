"use client"

import { createTournament } from "@/app/actions"
import { useState } from "react"

export default function NewTournamentPage() {
  const [sport, setSport] = useState("FOOTBALL")

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Crea Nuovo Torneo</h2>
      <form action={createTournament} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Torneo *</label>
          <input name="name" type="text" required className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="Es. Coppa Estiva 2026"/>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Descrizione</label>
          <textarea name="description" className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" rows={3} placeholder="Dettagli aggiuntivi..."></textarea>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sport</label>
            <select name="sport" value={sport} onChange={e => setSport(e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="FOOTBALL">Calcio / Calcetto</option>
              <option value="BASKETBALL">Basket</option>
              <option value="TENNIS">Tennis</option>
              <option value="PADEL">Padel</option>
              <option value="VOLLEYBALL">Pallavolo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Formato</label>
            <select name="format" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ROUND_ROBIN">Gironi (All'italiana)</option>
              <option value="SINGLE_ELIMINATION">Eliminazione Diretta</option>
              <option value="DOUBLE_ELIMINATION">Doppia Eliminazione</option>
              <option value="CHAMPIONS_LEAGUE">Champions League (Misto)</option>
            </select>
          </div>
        </div>
        
        {sport === 'VOLLEYBALL' && (
          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
            <h3 className="font-bold text-indigo-900 mb-3">Impostazioni Pallavolo</h3>
            <div>
              <label className="block text-sm font-semibold text-indigo-800 mb-2">Formato Set</label>
              <select name="volleyballSets" className="w-full border border-indigo-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="3">Al meglio dei 3 set (vince chi arriva a 2)</option>
                <option value="5">Al meglio dei 5 set (vince chi arriva a 3)</option>
              </select>
            </div>
          </div>
        )}
        
        <div className="pt-6 border-t mt-4">
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-md">
            Salva Torneo e Continua
          </button>
        </div>
      </form>
    </div>
  )
}

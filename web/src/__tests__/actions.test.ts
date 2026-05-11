import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { recalculateStandings } from '@/app/actions'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      standing: {
        updateMany: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      match: {
        findMany: vi.fn(),
      }
    }
  }
})

// createTournament ha firma (prevState, formData) perché usa useActionState.
// Questa funzione helper crea un FormData precompilato con i campi obbligatori.
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, val] of Object.entries(fields)) {
    fd.append(key, val)
  }
  return fd
}

describe('actions.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createTournament (Security & Validation)', () => {
    it('dovrebbe rigettare un form senza nome (Zod Validation)', async () => {
      // createTournament ora accetta (prevState, formData) — prevState è undefined alla prima chiamata
      const formData = makeFormData({ format: 'ROUND_ROBIN', sport: 'FOOTBALL' })

      const { createTournament } = await import('@/app/actions')
      // Deve ritornare { error: '...' } invece di lanciare (perché abbiamo cambiato throw -> return)
      const result = await createTournament(undefined, formData)
      expect(result).toBeDefined()
      expect(result?.error).toMatch(/Validazione fallita/)
    })

    it('dovrebbe bloccare le richieste che superano il rate limit', async () => {
      const { createTournament } = await import('@/app/actions')

      // 5 chiamate valide (dentro il limite)
      for (let i = 0; i < 5; i++) {
        const fd = makeFormData({ name: `Test Torneo ${i}`, format: 'ROUND_ROBIN', sport: 'FOOTBALL' })
        // Non ci aspettiamo che abbiano successo (manca il DB), solo che non diano rate limit
        try { await createTournament(undefined, fd) } catch { /* ignora errori DB nei test */ }
      }

      // La 6a chiamata deve ritornare l'errore di rate limit
      const fd = makeFormData({ name: 'Test 6', format: 'ROUND_ROBIN', sport: 'FOOTBALL' })
      const result = await createTournament(undefined, fd)
      expect(result).toBeDefined()
      expect(result?.error).toMatch(/Troppe richieste/)
    })
  })

  describe('recalculateStandings', () => {
    it('dovrebbe calcolare correttamente una partita di volley 3-2 (2 pts al vincitore, 1 al perdente)', async () => {
      const tournamentId = 't1';

      const mockStandings = [
        { id: 's1', teamId: 'team1', points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, pointsFor: 0, pointsAgainst: 0, pointsDifference: 0 },
        { id: 's2', teamId: 'team2', points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, pointsFor: 0, pointsAgainst: 0, pointsDifference: 0 }
      ];

      const mockMatches = [
        {
          id: 'm1',
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          homeScore: 3,
          awayScore: 2,
          setScores: [
            { home: 25, away: 20 }, // 25+20+25+22+15 = 107 home | 20+25+22+25+10 = 102 away
            { home: 20, away: 25 },
            { home: 25, away: 22 },
            { home: 22, away: 25 },
            { home: 15, away: 10 }
          ]
        }
      ];

      (prisma.standing.findMany as any).mockResolvedValue(mockStandings);
      (prisma.match.findMany as any).mockResolvedValue(mockMatches);

      await recalculateStandings(tournamentId, 'VOLLEYBALL');

      expect(prisma.standing.update).toHaveBeenCalledTimes(2);

      // Team 1 ha vinto 3-2 → 2 punti classifica
      expect(prisma.standing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({
          points: 2,
          wins: 1,
          losses: 0,
          goalsFor: 3,
          goalsAgainst: 2,
          pointsFor: 107,
          pointsAgainst: 102,
        })
      }));

      // Team 2 ha perso 2-3 → 1 punto classifica
      expect(prisma.standing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's2' },
        data: expect.objectContaining({
          points: 1,
          wins: 0,
          losses: 1,
          goalsFor: 2,
          goalsAgainst: 3,
          pointsFor: 102,
          pointsAgainst: 107,
        })
      }));
    });

    it('dovrebbe assegnare 3 punti per una vittoria 3-0 senza dare punti al perdente', async () => {
      const tournamentId = 't2';

      const mockStandings = [
        { id: 's1', teamId: 'team1', points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, pointsFor: 0, pointsAgainst: 0, pointsDifference: 0 },
        { id: 's2', teamId: 'team2', points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, pointsFor: 0, pointsAgainst: 0, pointsDifference: 0 }
      ];

      const mockMatches = [
        {
          id: 'm2',
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          homeScore: 3,
          awayScore: 0,
          setScores: [
            { home: 25, away: 15 },
            { home: 25, away: 18 },
            { home: 25, away: 20 }
          ]
        }
      ];

      (prisma.standing.findMany as any).mockResolvedValue(mockStandings);
      (prisma.match.findMany as any).mockResolvedValue(mockMatches);

      await recalculateStandings(tournamentId, 'VOLLEYBALL');

      // Team 1 vince 3-0 → 3 punti, team 2 → 0 punti
      expect(prisma.standing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ points: 3 })
      }));

      expect(prisma.standing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's2' },
        data: expect.objectContaining({ points: 0 })
      }));
    });

    it('dovrebbe assegnare 3 punti per una vittoria di calcio e 0 al perdente (no pareggio)', async () => {
      const tournamentId = 't3';

      const mockStandings = [
        { id: 's1', teamId: 'team1', points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, pointsFor: 0, pointsAgainst: 0, pointsDifference: 0 },
        { id: 's2', teamId: 'team2', points: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, pointsFor: 0, pointsAgainst: 0, pointsDifference: 0 }
      ];

      const mockMatches = [
        { id: 'm3', homeTeamId: 'team1', awayTeamId: 'team2', homeScore: 2, awayScore: 0, setScores: null }
      ];

      (prisma.standing.findMany as any).mockResolvedValue(mockStandings);
      (prisma.match.findMany as any).mockResolvedValue(mockMatches);

      await recalculateStandings(tournamentId, 'FOOTBALL');

      expect(prisma.standing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ points: 3, wins: 1 })
      }));
      expect(prisma.standing.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's2' },
        data: expect.objectContaining({ points: 0, losses: 1 })
      }));
    });
  });
});

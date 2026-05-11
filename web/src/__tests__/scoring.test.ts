import { describe, it, expect } from 'vitest'
import {
  shouldEndVolleyballSet,
  shouldEndTennisSet,
  calculateSetsWon,
  isVolleyballMatchOver,
} from '@/lib/scoring'

describe('scoring.ts', () => {
  describe('shouldEndVolleyballSet', () => {
    it('dovrebbe terminare il set a 25 con 2 punti di vantaggio', () => {
      expect(shouldEndVolleyballSet(25, 23, 1, 5)).toBe(true)
      expect(shouldEndVolleyballSet(26, 24, 1, 5)).toBe(true)
    })

    it('NON dovrebbe terminare a 25-24 (vantaggio insufficiente)', () => {
      expect(shouldEndVolleyballSet(25, 24, 1, 5)).toBe(false)
    })

    it('NON dovrebbe terminare a 24-22 (non ancora a 25)', () => {
      expect(shouldEndVolleyballSet(24, 22, 1, 5)).toBe(false)
    })

    it('il 5° set (BO5) dovrebbe terminare a 15 con 2 di vantaggio', () => {
      expect(shouldEndVolleyballSet(15, 13, 5, 5)).toBe(true)
      expect(shouldEndVolleyballSet(16, 14, 5, 5)).toBe(true)
    })

    it('il 5° set NON dovrebbe terminare a 15-14', () => {
      expect(shouldEndVolleyballSet(15, 14, 5, 5)).toBe(false)
    })

    it('il 3° set (BO3) dovrebbe terminare a 15', () => {
      expect(shouldEndVolleyballSet(15, 13, 3, 3)).toBe(true)
    })

    it('NON dovrebbe terminare se nessuno ha ancora raggiunto 25', () => {
      expect(shouldEndVolleyballSet(20, 18, 1, 5)).toBe(false)
    })
  })

  describe('shouldEndTennisSet', () => {
    it('dovrebbe terminare a 6-4', () => {
      expect(shouldEndTennisSet(6, 4)).toBe(true)
    })

    it('dovrebbe terminare a 6-0', () => {
      expect(shouldEndTennisSet(6, 0)).toBe(true)
    })

    it('NON dovrebbe terminare a 6-5', () => {
      expect(shouldEndTennisSet(6, 5)).toBe(false)
    })

    it('dovrebbe terminare il tiebreak a 7-6', () => {
      expect(shouldEndTennisSet(7, 6)).toBe(true)
    })

    it('NON dovrebbe terminare a 6-6 (si va al tiebreak)', () => {
      expect(shouldEndTennisSet(6, 6)).toBe(false)
    })
  })

  describe('calculateSetsWon', () => {
    it('dovrebbe calcolare correttamente i set vinti', () => {
      const sets = [
        { home: 25, away: 20 },
        { home: 20, away: 25 },
        { home: 25, away: 18 },
      ]
      expect(calculateSetsWon(sets)).toEqual({ home: 2, away: 1 })
    })

    it('dovrebbe ritornare 0-0 per array vuoto', () => {
      expect(calculateSetsWon([])).toEqual({ home: 0, away: 0 })
    })

    it('dovrebbe gestire un 3-0', () => {
      const sets = [
        { home: 25, away: 15 },
        { home: 25, away: 18 },
        { home: 25, away: 20 },
      ]
      expect(calculateSetsWon(sets)).toEqual({ home: 3, away: 0 })
    })
  })

  describe('isVolleyballMatchOver', () => {
    it('BO5: partita finita quando una squadra vince 3 set', () => {
      expect(isVolleyballMatchOver([
        { home: 25, away: 20 },
        { home: 25, away: 18 },
        { home: 25, away: 22 },
      ], 5)).toBe(true)
    })

    it('BO5: partita NON finita con 2 set ciascuno', () => {
      expect(isVolleyballMatchOver([
        { home: 25, away: 20 },
        { home: 18, away: 25 },
        { home: 25, away: 22 },
        { home: 20, away: 25 },
      ], 5)).toBe(false)
    })

    it('BO3: partita finita quando una squadra vince 2 set', () => {
      expect(isVolleyballMatchOver([
        { home: 25, away: 20 },
        { home: 25, away: 18 },
      ], 3)).toBe(true)
    })

    it('BO3: partita NON finita con 1 set ciascuno', () => {
      expect(isVolleyballMatchOver([
        { home: 25, away: 20 },
        { home: 18, away: 25 },
      ], 3)).toBe(false)
    })
  })
})

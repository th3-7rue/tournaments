# Tournament Workflow: Create to Finish

This document describes the step-by-step workflow an admin follows to create, manage, and complete a tournament in the LiveCup platform.

---

## Prerequisites

- Admin logs in at `/admin/login` (credentials-based auth via NextAuth).
- On first login, the app auto-creates the default `admin` user.

---

## Step 1 — Create a Tournament

**Page:** `/admin/tournaments/new` (link: `/admin > I tuoi Tornei > + Crea Torneo`)

The admin fills in:

| Field | Required | Notes |
|---|---|---|
| **Nome Torneo** | Yes | Max 100 chars (e.g. "Coppa Estiva 2026") |
| **Descrizione** | No | Free-form text |
| **Sport** | Yes | Football, Basketball, Volleyball, Beach Volley, Tennis, Padel, Custom |
| **Formato** | Yes | One of: Round Robin, Single Elimination, Double Elimination, Champions League |
| **Impostazioni Set** | Conditional | Only shown for volleyball sports: best-of-3 or best-of-5 |

After submitting, the tournament is created in `DRAFT` status and the user is redirected to the tournament detail page.

---

## Step 2 — View Tournament Details

**Page:** `/admin/tournaments/[id]`

The page shows:
- Tournament name, sport, format, and status.
- **Squadre** panel — list of registered teams (with "+ Aggiungi" link).
- **Calendario** panel — matches (if generated), or a button to auto-generate them.

---

## Step 3 — Add Teams

**Page:** `/admin/teams/new`

The admin selects a tournament from the dropdown and enters the team name. Teams are stored with a reference to their tournament (and optionally a group).

After adding teams, return to the tournament detail page to proceed.

---

## Step 4 — Generate the Schedule / Bracket

**Page:** `/admin/tournaments/[id]` — **Calendario** panel

If at least 2 teams are registered, the admin clicks **"Genera Calendario Automagico"**. This triggers the server action `generateTournamentMatches`, which:

1. Runs the **Berger algorithm** (Round-Robin scheduling) to distribute matches across rounds.
2. Handles odd-numbered team counts by assigning byes.
3. Pre-maps `nextMatchId` fields so winners progress in bracket formats.
4. Sets the tournament status to `ONGOING`.

For bracket formats (Single/Double Elimination, Champions League), the generator also:
- Rounds the participant count to the nearest power of 2.
- Inserts BYE matches for non-power-of-2 counts.
- Sets up `bracket` (WINNER/LOSER) and `nextLoserMatchId` for Double Elimination.

---

## Step 5 — Enter Match Results

There are two ways to record scores:

### Option A: Manual Entry (Desktop)

**Page:** `/admin/matches`

The admin sees all matches for all ongoing/completed tournaments. For each match:
- Home/Away team names and current score are displayed.
- For volleyball sports: a set-by-set input grid (S1, S2, ...).
- For other sports: a simple home/away score input.
- Clicking **Salva** calls `updateMatchScore`, which validates and persists the result, then broadcasts it via Socket.IO to connected clients.

### Option B: Live Scorer (Mobile / On-Site)

**Page:** `/admin/matches/[matchId]/live`

This is a full-screen, touch-optimized interface designed for referees or staff on-site:

1. **PRONTA** → Admin clicks **"🏁 Inizia Partita"** to set the match status to `LIVE`.
2. **LIVE** → Two large buttons (+1 for each team) record points point-by-point.
   - For **volleyball sports**: points accumulate within a set. When a set-ending condition is met (e.g. a team reaches 25 points with a 2-point lead), a **"Chiudi Set"** button appears.
   - After closing a set, the next set begins with 0–0. Set scores are tracked and displayed as summary chips.
   - For **non-volleyball sports** (football, basketball, etc.): the +1/+2/+3 buttons accumulate a total score directly.
3. **Match Over** → When the match-ending condition is met (e.g. a team wins the required number of sets), the **"🏆 Termina Partita"** button appears.
4. **Salvataggio** → Clicking the finish button calls `updateMatchScore`, which:
   - Sets the match status to `FINISHED`.
   - Persists all set scores and final result.
   - Triggers `recalculateStandings` to update the tournament table.
   - Broadcasts the result via Socket.IO.
5. The admin clicks **"← Torna alle Partite"** to return.

---

## Step 6 — Real-Time Spectator View

**Page:** `/tournament/[id]` (public, no login required)

Spectators viewing this page receive live updates via Socket.IO (`score-update` event). The `LiveMatchGrid` and `LiveRefresher` components re-render match scores in real-time without a page reload.

---

## Step 7 — Tournament Completion

A tournament reaches `COMPLETED` status when all its matches are finished. The admin can:

- View the final standings on the tournament detail page.
- Edit any match result via the **✎ Modifica** link on the matches page.
- Delete the tournament (cascading delete removes all associated teams, matches, groups, and standings).

---

## Scoring Engine (Behind the Scenes)

When a match transitions to `FINISHED`, the scoring engine runs automatically:

| Sport Category | Point System |
|---|---|
| **Football / Basketball / Custom** | Win = 3pts, Draw = 1pt, Loss = 0pts. Updates: `points`, `wins`, `draws`, `losses`, `goalsFor`, `goalsAgainst`, `goalDifference`. |
| **Volleyball / Beach Volley / Tennis / Padel** | Reads `setScores` JSON. Italian volleyball rules: 3–0 or 3–1 win = 3pts, 3–2 win = 2pts, 2–3 loss = 1pt, 0–3 or 1–3 loss = 0pts. Updates: `pointsFor`, `pointsAgainst`, `pointsDifference`. |

---

## Data Flow Summary

```
Create Tournament (DRAFT)
  → Add Teams
    → Generate Schedule/Bracket
      → Status: ONGOING
        → Enter Match Results (LIVE → FINISHED)
          → Standings auto-updated
            → Socket.IO broadcast to spectators
              → Tournament COMPLETED (all matches done)
```

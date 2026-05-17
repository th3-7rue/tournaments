    1. Tournament status transitions: Once a tournament is generated, it goes to ONGOING. But what if the admin wants to go back and add more teams after generation? Can they? The generate
        action sets status to ONGOING - can you still add teams to an ONGOING tournament?

     2. ✅ RESOLVED: Groups management UI added at `/admin/tournaments/[id]/groups` with full CRUD operations

     3. ✅ RESOLVED: generateTournamentMatches now supports all formats:
         - ROUND_ROBIN: Uses Berger algorithm
         - SINGLE_ELIMINATION: Knockout bracket with BYEs for non-power-of-2 teams
         - DOUBLE_ELIMINATION: Winner + Loser brackets with grand final
         - CHAMPIONS_LEAGUE: Group stage + knockout bracket

     4. ✅ RESOLVED: Individual match deletion added at `/admin/matches/[matchId]/edit` with confirmation dialog. Admins can now delete specific matches without removing the whole tournament.

     5. Standings recalculation: The recalculateStandings function is called on match save, but I need to verify it's actually handling all the edge cases properly.

     6. No undo: Once a match is FINISHED, the admin can edit it (✎ Modifica link), but there's no undo if they made a mistake.

     7. Double Elimination complexity: The generation handles nextMatchId and nextLoserMatchId, but I should check whether the losers' bracket actually gets populated correctly.

     8. No tournament edit after creation: There's no /admin/tournaments/[id]/edit page - you can't change the sport, format, name, etc. once created.

     9. Socket.IO vs SSE conflict: The REQUISITI document mentions SSE as preferred for self-hosted, but the code uses Socket.IO - there's a mismatch between the architecture docs and
        implementation.

     10. No team removal: The workflow mentions adding teams but doesn't show if there's a way to remove them once added.

     11. Match editing: The workflow notes that admins can edit any match result after it's FINISHED, but there's no validation to prevent changing a result that's already affected standings for
          subsequent rounds.

     12. No tournament status transition to COMPLETED: There's no UI action to mark a tournament as COMPLETED - it seems to depend on all matches being finished automatically.

     13. No validation on team count for bracket formats: Single elimination requires power of 2, but there's no validation when creating the tournament - it gets caught at generation time.

     14. The LiveScorer is a Client Component but calls server actions: This works with Next.js, but there's no loading state or error recovery if Socket.IO disconnects during a live match.

     15. No duplicate team name validation: Adding a team doesn't check for duplicates within a tournament.

     16. No group creation for multi-group tournaments: Round Robin with more teams than fits in one group doesn't show how to create multiple groups.

     Workflow Gaps
     - No group management: The schema has a Group model, but there's zero UI for creating groups. Round Robin with many teams can't split into multiple groups.
     - No tournament edit: Name, sport, format, and dates are immutable after creation. A wrong sport selection = recreate everything.
     - Generate is irreversible: The action sets status to ONGOING. You can't go back to DRAFT to add teams or fix the schedule.

    Bracket Generation
     - generateTournamentMatches uses the Berger algorithm (Round Robin only). Single/Double Elimination and Champions League formats have no generator logic — they'd need manual match
       creation.
     - No validation on team count for bracket formats. Single Elimination needs a power of 2, but there's no warning at creation time.

    Data Integrity
     - Bracket format chains are fragile: In Single/Double Elimination, if a match result is edited after the next round has started, downstream matches aren't invalidated or re-linked.
     - No COMPLETED transition trigger: The tournament status never automatically becomes COMPLETED when all matches finish. It stays ONGOING until someone manually updates it.

    Live Scorer Risks
     - No disconnect recovery: If the referee loses connectivity on the LiveScorer page, the Socket.IO connection drops with no reconnection logic or unsaved-points warning.
     - No confirmation on finish: Clicking "🏆 Termina Partita" saves permanently with no confirmation dialog. Accidental tap = locked result.

    Optimizations Worth Considering
     1. Add a "lock schedule" step — keep tournaments in DRAFT until the admin explicitly locks, then generation happens.
     2. Add team delete + tournament edit (with a "locked" guard so you can't edit after generation).
     3. Auto-transition tournament to COMPLETED via a cron or a check on the tournament detail page.
     4. Add Socket.IO reconnection with a warning about unsaved live points.
     5. Add a confirmation dialog before finishing a match and before deleting a tournament.

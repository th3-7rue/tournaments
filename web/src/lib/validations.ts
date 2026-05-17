import { z } from "zod";
import { SPORT_OPTIONS } from "@/lib/sports";

export const CreateTournamentSchema = z.object({
  name: z
    .string()
    .min(1, "Il nome del torneo è obbligatorio")
    .max(100, "Nome troppo lungo"),
  description: z.string().optional(),
  format: z.enum([
    "ROUND_ROBIN",
    "SINGLE_ELIMINATION",
    "DOUBLE_ELIMINATION",
    "CHAMPIONS_LEAGUE",
  ]),
  sport: z.enum(SPORT_OPTIONS),
  volleyballSets: z.coerce.number().min(3).max(5).optional().default(5),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1, "Il nome della squadra è obbligatorio").max(50),
  tournamentId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1, "Il nome del girone è obbligatorio").max(50),
  tournamentId: z.string().uuid(),
});

export const SetScoreSchema = z.object({
  home: z.number().min(0),
  away: z.number().min(0),
});

export const UpdateScoreSchema = z
  .object({
    matchId: z.string().uuid("ID partita non valido"),
    homeScore: z.coerce.number().min(0).optional(),
    awayScore: z.coerce.number().min(0).optional(),
    setScores: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return null;
        try {
          const parsed = JSON.parse(val);
          return z.array(SetScoreSchema).parse(parsed);
        } catch {
          throw new Error("Formato set non valido");
        }
      }),
  })
  .refine(
    (data) => {
      if (data.setScores) return true;
      return data.homeScore !== undefined && data.awayScore !== undefined;
    },
    {
      message: "I punteggi sono mancanti",
    },
  );

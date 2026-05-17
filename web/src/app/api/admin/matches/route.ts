import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: { in: ["ONGOING", "COMPLETED"] } },
      include: {
        matches: {
          include: { homeTeam: true, awayTeam: true },
          orderBy: { matchDate: "asc" },
        },
      },
    });

    return NextResponse.json(
      tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        sport: t.sport,
        matches: t.matches.map((m) => ({
          id: m.id,
          homeTeam: { name: m.homeTeam?.name || "" },
          awayTeam: { name: m.awayTeam?.name || "" },
          status: m.status,
        })),
      })),
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Failed to fetch matches:", e);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}

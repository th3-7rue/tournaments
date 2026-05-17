import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        sport: true,
        startDate: true,
        endDate: true,
        volleyballSets: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Torneo non trovato" },
        { status: 404 },
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Error fetching tournament:", error);
    return NextResponse.json(
      { error: "Errore nel caricamento del torneo" },
      { status: 500 },
    );
  }
}

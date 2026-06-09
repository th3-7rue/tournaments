import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await request.json()

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId mancante" },
        { status: 400 },
      )
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { tournament: true },
    })

    if (!team) {
      return NextResponse.json(
        { error: "Squadra non trovata" },
        { status: 404 },
      )
    }

    // Delete matches involving this team
    await prisma.match.deleteMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
    })

    // Delete standing
    await prisma.standing.deleteMany({
      where: { teamId },
    })

    // Delete the team (cascade will handle related data)
    await prisma.team.delete({ where: { id: teamId } })

    // Force revalidation
    await prisma.$queryRaw`SELECT 1;`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting team:", error)
    return NextResponse.json(
      { error: error.message || "Errore nella cancellazione" },
      { status: 500 },
    )
  }
}

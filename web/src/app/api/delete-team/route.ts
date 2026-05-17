import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { teamId } = body
    if (!teamId) return NextResponse.json({ error: 'teamId missing' }, { status: 400 })

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { tournamentId: true },
    })
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

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

    await prisma.team.delete({ where: { id: teamId } })

    revalidatePath('/admin/teams')
    revalidatePath(`/admin/tournaments/${team.tournamentId}`)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'delete failed' }, { status: 500 })
  }
}

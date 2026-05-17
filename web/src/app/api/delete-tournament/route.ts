import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tournamentId } = body
    if (!tournamentId) return NextResponse.json({ error: 'tournamentId missing' }, { status: 400 })

    await prisma.tournament.delete({ where: { id: tournamentId } })

    revalidatePath('/admin/tournaments')
    revalidatePath('/')

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'delete failed' }, { status: 500 })
  }
}

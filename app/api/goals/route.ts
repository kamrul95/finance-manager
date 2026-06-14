import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().default(0),
  currency: z.string().default('BDT'),
  deadline: z.string().nullable().optional(),
  note: z.string().optional(),
})

export async function GET() {
  try {
    const user = await requireUser()
    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(goals)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data = goalSchema.parse(body)
    const goal = await prisma.goal.create({
      data: {
        ...data,
        userId: user.id,
        deadline: data.deadline ? new Date(data.deadline) : null,
      },
    })
    return NextResponse.json(goal, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

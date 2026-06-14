import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const debtSchema = z.object({
  personName: z.string().min(1),
  direction: z.enum(['LENT', 'BORROWED']),
  amount: z.number().positive(),
  currency: z.string().default('BDT'),
  dueDate: z.string().nullable().optional(),
  note: z.string().optional(),
})

export async function GET() {
  try {
    const user = await requireUser()
    const debts = await prisma.debt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(debts)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data = debtSchema.parse(body)
    const debt = await prisma.debt.create({
      data: {
        ...data,
        userId: user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    })
    return NextResponse.json(debt, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

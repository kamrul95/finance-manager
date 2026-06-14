import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'
import { getMonthRange } from '@/lib/utils'

const budgetSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().default('BDT'),
  period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
  rollover: z.boolean().default(false),
})

export async function GET() {
  try {
    const user = await requireUser()
    const { start, end } = getMonthRange()

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    })

    // Attach spent amount for each budget this month
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const where: Record<string, unknown> = {
          userId: user.id,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
        }
        if (budget.categoryId) {
          // Include the category itself + all its subcategories
          const subs = await prisma.category.findMany({
            where: { userId: user.id, parentId: budget.categoryId },
            select: { id: true },
          })
          const ids = [budget.categoryId, ...subs.map(s => s.id)]
          where.categoryId = { in: ids }
        }

        const agg = await prisma.transaction.aggregate({
          where,
          _sum: { amountInDefaultCurrency: true },
        })
        return { ...budget, spent: agg._sum.amountInDefaultCurrency ?? 0 }
      })
    )

    return NextResponse.json(budgetsWithSpent)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data = budgetSchema.parse(body)
    const budget = await prisma.budget.create({ data: { ...data, userId: user.id } })
    return NextResponse.json(budget, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

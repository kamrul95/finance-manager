import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['EXPENSE', 'INCOME']),
  parentId: z.string().nullable().optional(),
  color: z.string().default('#6366f1'),
  icon: z.string().default('tag'),
})

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as 'EXPENSE' | 'INCOME' | null

    const categories = await prisma.category.findMany({
      where: { userId: user.id, parentId: null, ...(type ? { type } : {}) },
      include: { subcategories: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data = categorySchema.parse(body)
    const category = await prisma.category.create({
      data: { ...data, userId: user.id },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

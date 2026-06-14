import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['CASH', 'BANK', 'MOBILE_BANKING', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'DEBT', 'OTHER']).optional(),
  currency: z.string().optional(),
  balance: z.number().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isExcluded: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const data = updateSchema.parse(body)
    const wallet = await prisma.wallet.updateMany({
      where: { id, userId: user.id },
      data,
    })
    return NextResponse.json(wallet)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    await prisma.wallet.updateMany({
      where: { id, userId: user.id },
      data: { isArchived: true },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to archive wallet' }, { status: 500 })
  }
}

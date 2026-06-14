import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const walletSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CASH', 'BANK', 'MOBILE_BANKING', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'DEBT', 'OTHER']).default('CASH'),
  currency: z.string().default('BDT'),
  balance: z.number().default(0),
  color: z.string().default('#6366f1'),
  icon: z.string().default('wallet'),
  isExcluded: z.boolean().default(false),
})

export async function GET() {
  try {
    const user = await requireUser()
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(wallets)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data = walletSchema.parse(body)
    const wallet = await prisma.wallet.create({
      data: { ...data, userId: user.id },
    })
    return NextResponse.json(wallet, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

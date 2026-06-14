import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { bdStartOfDay, bdEndOfDay } from '@/lib/utils'
import { z } from 'zod'

const txSchema = z.object({
  walletId: z.string(),
  categoryId: z.string().nullable().optional(),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  amount: z.number().positive(),
  currency: z.string().default('BDT'),
  amountInDefaultCurrency: z.number().positive().optional(),
  defaultCurrency: z.string().default('BDT'),
  transferToWalletId: z.string().nullable().optional(),
  date: z.string(),
  note: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
})

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)

    const where: Record<string, unknown> = { userId: user.id }
    if (searchParams.get('walletId')) {
      const wId = searchParams.get('walletId')!
      // Include transfers where this wallet is the destination too
      where.OR = [
        { walletId: wId },
        { type: 'TRANSFER', transferToWalletId: wId },
      ]
    }
    if (searchParams.get('type')) where.type = searchParams.get('type')
    if (searchParams.get('categoryId')) {
      const catId = searchParams.get('categoryId')!
      // Include the category itself + any subcategories under it
      const subs = await prisma.category.findMany({
        where: { userId: user.id, parentId: catId },
        select: { id: true },
      })
      const ids = [catId, ...subs.map(s => s.id)]
      where.categoryId = { in: ids }
    }

    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from || to) {
      where.date = {
        ...(from ? { gte: bdStartOfDay(from) } : {}),
        ...(to   ? { lte: bdEndOfDay(to)     } : {}),
      }
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { wallet: true, category: { include: { parent: true } }, transferToWallet: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    // Mask archived wallet names
    const masked = transactions.map(tx => ({
      ...tx,
      wallet: tx.wallet.isArchived ? { ...tx.wallet, name: 'Archived Wallet' } : tx.wallet,
      transferToWallet: tx.transferToWallet?.isArchived
        ? { ...tx.transferToWallet, name: 'Archived Wallet' }
        : tx.transferToWallet,
    }))

    return NextResponse.json({ transactions: masked, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data = txSchema.parse(body)

    // Validate transfer has a destination
    if (data.type === 'TRANSFER' && !data.transferToWalletId) {
      return NextResponse.json({ error: 'Transfer requires a destination wallet' }, { status: 400 })
    }

    const amountInDefault = data.amountInDefaultCurrency ?? data.amount
    const date = bdStartOfDay(data.date)

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: user.id,
          walletId: data.walletId,
          categoryId: data.categoryId ?? null,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          amountInDefaultCurrency: amountInDefault,
          defaultCurrency: data.defaultCurrency,
          transferToWalletId: data.transferToWalletId ?? null,
          date,
          note: data.note,
          tags: data.tags,
        },
      })

      // Update wallet balances
      if (data.type === 'EXPENSE') {
        await tx.wallet.update({ where: { id: data.walletId }, data: { balance: { decrement: data.amount } } })
      } else if (data.type === 'INCOME') {
        await tx.wallet.update({ where: { id: data.walletId }, data: { balance: { increment: data.amount } } })
      } else if (data.type === 'TRANSFER') {
        await tx.wallet.update({ where: { id: data.walletId }, data: { balance: { decrement: data.amount } } })
        await tx.wallet.update({ where: { id: data.transferToWalletId! }, data: { balance: { increment: data.amount } } })
      }

      return created
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    console.error('POST /api/transactions error:', e)
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 })
  }
}

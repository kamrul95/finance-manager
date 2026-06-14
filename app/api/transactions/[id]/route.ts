import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { bdStartOfDay } from '@/lib/utils'
import { z } from 'zod'

const updateSchema = z.object({
  walletId: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']).optional(),
  amount: z.number().positive().optional(),
  transferToWalletId: z.string().nullable().optional(),
  date: z.string().optional(),
  note: z.string().nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const data = updateSchema.parse(body)

    const old = await prisma.transaction.findFirst({ where: { id, userId: user.id } })
    if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newType = data.type ?? old.type
    const newAmount = data.amount ?? old.amount
    const newWalletId = data.walletId ?? old.walletId
    const newTransferToWalletId = data.transferToWalletId !== undefined ? data.transferToWalletId : old.transferToWalletId

    await prisma.$transaction(async (tx) => {
      // Reverse old balance effect
      if (old.type === 'EXPENSE') {
        await tx.wallet.update({ where: { id: old.walletId }, data: { balance: { increment: old.amount } } })
      } else if (old.type === 'INCOME') {
        await tx.wallet.update({ where: { id: old.walletId }, data: { balance: { decrement: old.amount } } })
      } else if (old.type === 'TRANSFER' && old.transferToWalletId) {
        await tx.wallet.update({ where: { id: old.walletId }, data: { balance: { increment: old.amount } } })
        await tx.wallet.update({ where: { id: old.transferToWalletId }, data: { balance: { decrement: old.amount } } })
      }

      // Apply new balance effect
      if (newType === 'EXPENSE') {
        await tx.wallet.update({ where: { id: newWalletId }, data: { balance: { decrement: newAmount } } })
      } else if (newType === 'INCOME') {
        await tx.wallet.update({ where: { id: newWalletId }, data: { balance: { increment: newAmount } } })
      } else if (newType === 'TRANSFER' && newTransferToWalletId) {
        await tx.wallet.update({ where: { id: newWalletId }, data: { balance: { decrement: newAmount } } })
        await tx.wallet.update({ where: { id: newTransferToWalletId }, data: { balance: { increment: newAmount } } })
      }

      // Update transaction record
      await tx.transaction.update({
        where: { id },
        data: {
          ...(data.walletId && { walletId: data.walletId }),
          ...(data.type && { type: data.type }),
          ...(data.amount && { amount: data.amount, amountInDefaultCurrency: data.amount }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.transferToWalletId !== undefined && { transferToWalletId: data.transferToWalletId }),
          ...(data.date && { date: bdStartOfDay(data.date) }),
          ...(data.note !== undefined && { note: data.note }),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    console.error(e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params

    const old = await prisma.transaction.findFirst({ where: { id, userId: user.id } })
    if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      if (old.type === 'EXPENSE') {
        await tx.wallet.update({ where: { id: old.walletId }, data: { balance: { increment: old.amount } } })
      } else if (old.type === 'INCOME') {
        await tx.wallet.update({ where: { id: old.walletId }, data: { balance: { decrement: old.amount } } })
      } else if (old.type === 'TRANSFER' && old.transferToWalletId) {
        await tx.wallet.update({ where: { id: old.walletId }, data: { balance: { increment: old.amount } } })
        await tx.wallet.update({ where: { id: old.transferToWalletId }, data: { balance: { decrement: old.amount } } })
      }
      await tx.transaction.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

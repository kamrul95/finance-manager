import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns'
import { bdStartOfDay, bdEndOfDay } from '@/lib/utils'

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const monthsParam = parseInt(searchParams.get('months') || '6')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const now = new Date()

    // Determine date range
    let start: Date, end: Date, useCustomRange = false
    if (fromParam && toParam) {
      start = bdStartOfDay(fromParam)   // BD midnight → UTC
      end = bdEndOfDay(toParam)         // BD end-of-day → UTC
      useCustomRange = true
    } else {
      start = startOfMonth(subMonths(now, monthsParam - 1))
      end = endOfMonth(now)
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
        type: { in: ['EXPENSE', 'INCOME'] },
      },
      include: { category: { include: { parent: true } } },
      orderBy: { date: 'asc' },
    })

    // Monthly trend — snap to month boundaries for chart buckets
    const trendStart = startOfMonth(start)
    const trendEnd = endOfMonth(end)
    const months = eachMonthOfInterval({ start: trendStart, end: trendEnd })
    const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {}
    for (const d of months) {
      const key = format(d, 'yyyy-MM')
      monthlyMap[key] = { month: format(d, 'MMM yy'), income: 0, expense: 0 }
    }

    for (const tx of transactions) {
      const key = format(tx.date, 'yyyy-MM')
      if (!monthlyMap[key]) continue
      if (tx.type === 'INCOME') monthlyMap[key].income += tx.amountInDefaultCurrency
      if (tx.type === 'EXPENSE') monthlyMap[key].expense += tx.amountInDefaultCurrency
    }

    // Category breakdown — use selected range (not just this month)
    const categoryMap: Record<string, { name: string; amount: number; color: string }> = {}
    for (const tx of transactions) {
      if (tx.type !== 'EXPENSE') continue
      const name = tx.category?.parent?.name ?? tx.category?.name ?? 'Uncategorized'
      const color = tx.category?.color ?? '#6366f1'
      if (!categoryMap[name]) categoryMap[name] = { name, amount: 0, color }
      categoryMap[name].amount += tx.amountInDefaultCurrency
    }

    // Net worth (wallet balances, excluding excluded wallets)
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id, isExcluded: false },
    })
    const netWorth = wallets.reduce((sum, w) => sum + w.balance, 0)

    // Period totals (always reflects selected range)
    const periodIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((s, t) => s + t.amountInDefaultCurrency, 0)
    const periodExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((s, t) => s + t.amountInDefaultCurrency, 0)

    // "This month" — always current calendar month, regardless of selected range
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const thisMonthTxns = useCustomRange
      ? await prisma.transaction.findMany({
          where: { userId: user.id, date: { gte: thisMonthStart, lte: thisMonthEnd }, type: { in: ['EXPENSE', 'INCOME'] } },
          include: { category: { include: { parent: true } } },
        })
      : transactions.filter(t => t.date >= thisMonthStart)

    const thisMonthIncome = thisMonthTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountInDefaultCurrency, 0)
    const thisMonthExpense = thisMonthTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountInDefaultCurrency, 0)

    // Category breakdown scoped to THIS MONTH only (for dashboard pie)
    const thisMonthCategoryMap: Record<string, { name: string; amount: number; color: string }> = {}
    for (const tx of thisMonthTxns) {
      if (tx.type !== 'EXPENSE') continue
      const cat = (tx as typeof transactions[0]).category
      const name = cat?.parent?.name ?? cat?.name ?? 'Uncategorized'
      const color = cat?.color ?? '#6366f1'
      if (!thisMonthCategoryMap[name]) thisMonthCategoryMap[name] = { name, amount: 0, color }
      thisMonthCategoryMap[name].amount += tx.amountInDefaultCurrency
    }

    return NextResponse.json({
      monthlyTrend: Object.values(monthlyMap),
      categoryBreakdown: Object.values(categoryMap).sort((a, b) => b.amount - a.amount),
      thisMonthCategoryBreakdown: Object.values(thisMonthCategoryMap).sort((a, b) => b.amount - a.amount),
      netWorth,
      thisMonth: { income: thisMonthIncome, expense: thisMonthExpense },
      period: { income: periodIncome, expense: periodExpense },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

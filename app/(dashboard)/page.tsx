'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, format, isToday, isThisWeek, isThisMonth,
} from 'date-fns'

interface ReportData {
  monthlyTrend: { month: string; income: number; expense: number }[]
  thisMonthCategoryBreakdown: { name: string; amount: number; color: string }[]
  netWorth: number
  thisMonth: { income: number; expense: number }
}

interface Transaction {
  id: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  amount: number
  date: string
  note: string | null
  category?: { name: string; color: string } | null
  wallet: { name: string }
}

type FilterPeriod = 'day' | 'week' | 'month'

function getRange(period: FilterPeriod, offset: number) {
  const base = new Date()
  let anchor: Date, from: Date, to: Date, label: string

  if (period === 'day') {
    anchor = addDays(base, offset)
    from = startOfDay(anchor)
    to = endOfDay(anchor)
    label = isToday(anchor) ? 'Today' : offset === -1 ? 'Yesterday' : format(anchor, 'MMM d, yyyy')
  } else if (period === 'week') {
    anchor = addWeeks(base, offset)
    from = startOfWeek(anchor, { weekStartsOn: 0 })
    to = endOfWeek(anchor, { weekStartsOn: 0 })
    label = isThisWeek(anchor, { weekStartsOn: 0 })
      ? 'This Week'
      : `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`
  } else {
    anchor = addMonths(base, offset)
    from = startOfMonth(anchor)
    to = endOfMonth(anchor)
    label = isThisMonth(anchor) ? 'This Month' : format(anchor, 'MMMM yyyy')
  }

  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
}

export default function Dashboard() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [walletTotal, setWalletTotal] = useState(0)
  const [period, setPeriod] = useState<FilterPeriod>('day')
  const [offset, setOffset] = useState(0)
  const [periodTotals, setPeriodTotals] = useState({ income: 0, expense: 0 })

  const { from, to, label } = getRange(period, offset)

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50', from, to })
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    const txns: Transaction[] = data.transactions ?? []
    setRecent(txns)
    const income = txns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const expense = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    setPeriodTotals({ income, expense })
  }, [from, to])

  useEffect(() => {
    fetch('/api/reports?months=6').then(r => r.json()).then(setReport)
    fetch('/api/wallets').then(r => r.json()).then((ws: { balance: number; isExcluded: boolean }[]) =>
      setWalletTotal(ws.filter(w => !w.isExcluded).reduce((s, w) => s + w.balance, 0))
    )
  }, [])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  const savings = report ? report.thisMonth.income - report.thisMonth.expense : 0

  const PERIODS: { key: FilterPeriod; label: string }[] = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net Worth" value={formatCurrency(walletTotal)} icon={<Wallet className="w-5 h-5 text-indigo-500" />} />
        <StatCard label="This Month Income" value={formatCurrency(report?.thisMonth.income ?? 0)} icon={<TrendingUp className="w-5 h-5 text-green-500" />} color="green" />
        <StatCard label="This Month Expense" value={formatCurrency(report?.thisMonth.expense ?? 0)} icon={<TrendingDown className="w-5 h-5 text-red-500" />} color="red" />
        <StatCard label="This Month Savings" value={formatCurrency(savings)} icon={<ArrowLeftRight className="w-5 h-5 text-blue-500" />} color={savings >= 0 ? 'blue' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly trend chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Income vs Expense (6 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={report?.monthlyTrend ?? []} barSize={12} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Spending (This Month)</h2>
          {report?.thisMonthCategoryBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={report.thisMonthCategoryBreakdown.slice(0, 6)} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {report.thisMonthCategoryBreakdown.slice(0, 6).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transactions</h2>
            <Link href="/transactions" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">View all</Link>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Period tabs */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setPeriod(p.key); setOffset(0) }}
                  className={`px-3 py-1.5 font-medium transition ${
                    period === p.key
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Prev / label / Next */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset(o => o - 1)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-24 text-center">{label}</span>
              <button
                onClick={() => setOffset(o => o + 1)}
                disabled={offset >= 0}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Period summary bar */}
        {recent.length > 0 && (
          <div className="flex items-center gap-6 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-xs text-green-600 font-medium">+{formatCurrency(periodTotals.income)}</span>
            <span className="text-xs text-red-500 font-medium">−{formatCurrency(periodTotals.expense)}</span>
            <span className={`text-xs font-semibold ml-auto ${periodTotals.income - periodTotals.expense >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
              Net {formatCurrency(periodTotals.income - periodTotals.expense)}
            </span>
          </div>
        )}

        {/* Transaction list */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recent.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No transactions for this period</div>
          )}
          {recent.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: tx.category?.color ?? '#6b7280' }}
                >
                  {(tx.category?.name ?? tx.wallet.name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {tx.category?.name ?? (tx.type === 'TRANSFER' ? 'Transfer' : tx.wallet.name)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tx.wallet.name}{tx.note ? ` · ${tx.note}` : ''} · {formatDate(tx.date)}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold shrink-0 ml-3 ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-600'}`}>
                {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '↔' : '−'}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'indigo' }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears,
  format, isToday, isThisWeek, isThisMonth, isThisYear,
} from 'date-fns'

interface ReportData {
  monthlyTrend: { month: string; income: number; expense: number }[]
  categoryBreakdown: { name: string; amount: number; color: string }[]
  netWorth: number
  thisMonth: { income: number; expense: number }
  period: { income: number; expense: number }
}

type FilterPeriod = 'day' | 'week' | '1m' | '3m' | '6m' | '1y' | 'range'

const PERIOD_OPTIONS: { key: FilterPeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
]

function getDateRange(period: FilterPeriod, offset: number, customFrom = '', customTo = '') {
  const now = new Date()

  if (period === 'range') {
    return {
      from: customFrom,
      to: customTo,
      label: customFrom && customTo ? `${customFrom} → ${customTo}` : 'Custom Range',
    }
  }

  if (period === 'day') {
    const anchor = addDays(now, offset)
    const from = startOfDay(anchor)
    const to = endOfDay(anchor)
    const label = isToday(anchor)
      ? 'Today'
      : offset === -1 ? 'Yesterday' : format(anchor, 'MMM d, yyyy')
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
  }

  if (period === 'week') {
    const anchor = addWeeks(now, offset)
    const from = startOfWeek(anchor, { weekStartsOn: 0 })
    const to = endOfWeek(anchor, { weekStartsOn: 0 })
    const label = isThisWeek(anchor, { weekStartsOn: 0 })
      ? 'This Week'
      : `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
  }

  if (period === '1m') {
    const anchor = addMonths(now, offset)
    const from = startOfMonth(anchor)
    const to = endOfMonth(anchor)
    const label = isThisMonth(anchor) ? 'This Month' : format(anchor, 'MMMM yyyy')
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
  }

  if (period === '3m') {
    const endAnchor = addMonths(now, offset)
    const startAnchor = addMonths(endAnchor, -2)
    const from = startOfMonth(startAnchor)
    const to = endOfMonth(endAnchor)
    const label = offset === 0
      ? `${format(from, 'MMM')} – ${format(to, 'MMM yyyy')}`
      : `${format(from, 'MMM')} – ${format(to, 'MMM yyyy')}`
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
  }

  if (period === '6m') {
    const endAnchor = addMonths(now, offset)
    const startAnchor = addMonths(endAnchor, -5)
    const from = startOfMonth(startAnchor)
    const to = endOfMonth(endAnchor)
    const label = `${format(from, 'MMM')} – ${format(to, 'MMM yyyy')}`
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
  }

  // 1y
  const anchor = addYears(now, offset)
  const from = startOfYear(anchor)
  const to = endOfYear(anchor)
  const label = isThisYear(anchor) ? 'This Year' : format(anchor, 'yyyy')
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), label }
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [period, setPeriod] = useState<FilterPeriod>('6m')
  const [offset, setOffset] = useState(0)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const { from, to, label: periodLabel } = getDateRange(period, offset, customFrom, customTo)

  const showNav = period !== 'range'
  const forwardDisabled = offset >= 0

  const loadReport = useCallback(async () => {
    if (period === 'range') {
      if (!customFrom || !customTo) return
      fetch(`/api/reports?from=${customFrom}&to=${customTo}`).then(r => r.json()).then(setReport)
    } else {
      fetch(`/api/reports?from=${from}&to=${to}`).then(r => r.json()).then(setReport)
    }
  }, [period, from, to, customFrom, customTo])

  useEffect(() => { loadReport() }, [loadReport])

  const savings = report ? report.thisMonth.income - report.thisMonth.expense : 0
  const periodIncome = report?.period?.income ?? 0
  const periodExpense = report?.period?.expense ?? 0
  const periodNet = periodIncome - periodExpense

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Net Worth</p>
          <p className="text-lg font-bold">{formatCurrency(report?.netWorth ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 mb-1">This Month Income</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(report?.thisMonth.income ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 mb-1">This Month Expense</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(report?.thisMonth.expense ?? 0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 mb-1">This Month Savings</p>
          <p className={`text-lg font-bold ${savings >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{formatCurrency(savings)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { setPeriod(opt.key); setOffset(0); setShowPicker(false) }}
              className={`px-3 py-1.5 font-medium transition ${
                period === opt.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => { setPeriod('range'); setOffset(0); setShowPicker(true) }}
            className={`px-3 py-1.5 font-medium transition flex items-center gap-1 ${
              period === 'range'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <CalendarRange className="w-3 h-3" />
            Range
          </button>
        </div>

        {/* Prev / label / Next */}
        {showNav && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOffset(o => o - 1)}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-32 text-center">{periodLabel}</span>
            <button
              onClick={() => setOffset(o => o + 1)}
              disabled={forwardDisabled}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Period totals pill */}
        {report && (
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {period === 'range' && <span className="text-gray-400">{periodLabel}</span>}
            <span className="text-green-600 font-medium">+{formatCurrency(periodIncome)}</span>
            <span className="text-red-500 font-medium">−{formatCurrency(periodExpense)}</span>
            <span className={`font-semibold ${periodNet >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
              Net {formatCurrency(periodNet)}
            </span>
          </div>
        )}
      </div>

      {/* Custom date range picker */}
      {period === 'range' && showPicker && (
        <div className="flex flex-wrap items-end gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowPicker(false)}
            disabled={!customFrom || !customTo}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {/* Monthly trend bar chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Income vs Expense Trend
          <span className="text-gray-400 font-normal ml-1">({periodLabel})</span>
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={report?.monthlyTrend ?? []} barSize={14} barGap={4}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} name="Income" />
            <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Savings + Expense line charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Savings</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={(report?.monthlyTrend ?? []).map(m => ({ ...m, savings: m.income - m.expense }))}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="savings" stroke="#6366f1" strokeWidth={2} dot={false} name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Expense</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={report?.monthlyTrend ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category pie + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Expense by Category <span className="text-gray-400 font-normal">({periodLabel})</span>
          </h2>
          {report?.categoryBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={report.categoryBreakdown.slice(0, 8)} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                  {report.categoryBreakdown.slice(0, 8).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expense data</div>}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Expense Categories</h2>
          <div className="space-y-3">
            {(report?.categoryBreakdown ?? []).slice(0, 8).map((cat, i) => {
              const total = (report?.categoryBreakdown ?? []).reduce((s, c) => s + c.amount, 0)
              const pct = total > 0 ? (cat.amount / total) * 100 : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>{cat.name}</span>
                    <span>{formatCurrency(cat.amount)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              )
            })}
            {!report?.categoryBreakdown?.length && <p className="text-sm text-gray-400 text-center py-6">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

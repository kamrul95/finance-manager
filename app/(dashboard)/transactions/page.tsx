'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Search, CalendarRange, Pencil, ChevronLeft, ChevronRight, Calculator } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import DatePicker from '@/components/ui/DatePicker'
import CategoryPicker from '@/components/ui/CategoryPicker'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears, format, isToday, isThisWeek, isThisMonth } from 'date-fns'

interface Wallet { id: string; name: string; currency: string }
interface Category { id: string; name: string; color: string; type?: string; subcategories: Category[] }
interface Transaction {
  id: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  amount: number
  date: string
  note: string | null
  tags: string[]
  walletId: string
  categoryId: string | null
  transferToWalletId: string | null
  wallet: { name: string }
  transferToWallet?: { name: string } | null
  category?: { name: string; color: string; parent?: { name: string } | null } | null
}

const TYPES = ['', 'EXPENSE', 'INCOME', 'TRANSFER']
type FilterPeriod = 'day' | 'week' | 'month' | 'year' | 'range' | 'all'

const PERIODS: { key: FilterPeriod; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'range', label: 'Range' },
]

function getDateRange(period: FilterPeriod, offset: number, customFrom: string, customTo: string): { from?: string; to?: string; label?: string } {
  const now = new Date()
  switch (period) {
    case 'day': {
      const d = addDays(now, offset)
      return {
        from: format(startOfDay(d), 'yyyy-MM-dd'),
        to: format(endOfDay(d), 'yyyy-MM-dd'),
        label: isToday(d) ? 'Today' : offset === -1 ? 'Yesterday' : format(d, 'MMM d, yyyy'),
      }
    }
    case 'week': {
      const d = addWeeks(now, offset)
      const s = startOfWeek(d, { weekStartsOn: 0 })
      const e = endOfWeek(d, { weekStartsOn: 0 })
      return {
        from: format(s, 'yyyy-MM-dd'),
        to: format(e, 'yyyy-MM-dd'),
        label: isThisWeek(d, { weekStartsOn: 0 }) ? 'This Week' : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`,
      }
    }
    case 'month': {
      const d = addMonths(now, offset)
      return {
        from: format(startOfMonth(d), 'yyyy-MM-dd'),
        to: format(endOfMonth(d), 'yyyy-MM-dd'),
        label: isThisMonth(d) ? 'This Month' : format(d, 'MMMM yyyy'),
      }
    }
    case 'year': {
      const d = addYears(now, offset)
      return {
        from: format(startOfYear(d), 'yyyy-MM-dd'),
        to: format(endOfYear(d), 'yyyy-MM-dd'),
        label: offset === 0 ? 'This Year' : format(d, 'yyyy'),
      }
    }
    case 'range': return { from: customFrom, to: customTo, label: customFrom && customTo ? `${customFrom} → ${customTo}` : '' }
    default:      return { label: 'All time' }
  }
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const autoOpenedRef = useRef(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [filter, setFilter] = useState({ type: '', walletId: '', categoryId: '', search: '' })
  const [period, setPeriod] = useState<FilterPeriod>('day')
  const [offset, setOffset] = useState(0)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showRangePicker, setShowRangePicker] = useState(false)
  const [page, setPage] = useState(1)
  const [periodTotals, setPeriodTotals] = useState({ income: 0, expense: 0 })

  const { label: periodLabel } = getDateRange(period, offset, customFrom, customTo)

  const loadTransactions = useCallback(async () => {
    if (period === 'range' && (!customFrom || !customTo)) return
    const { from, to } = getDateRange(period, offset, customFrom, customTo)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (filter.type) params.set('type', filter.type)
    if (filter.walletId) params.set('walletId', filter.walletId)
    if (filter.categoryId) params.set('categoryId', filter.categoryId)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    const txns: Transaction[] = data.transactions ?? []
    setTransactions(txns)
    setTotal(data.total ?? 0)
    const income = txns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const expense = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    setPeriodTotals({ income, expense })
  }, [page, filter, period, offset, customFrom, customTo])

  useEffect(() => { loadTransactions() }, [loadTransactions])
  useEffect(() => {
    fetch('/api/wallets').then(r => r.json()).then(d => setWallets(Array.isArray(d) ? d : []))
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []))
  }, [])
  useEffect(() => {
    if (!autoOpenedRef.current && searchParams.get('new') === '1') {
      autoOpenedRef.current = true
      setShowForm(true)
    }
  }, [searchParams])

  async function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    loadTransactions()
  }

  const displayed = filter.search
    ? transactions.filter(t =>
        (t.note ?? '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (t.category?.name ?? '').toLowerCase().includes(filter.search.toLowerCase()) ||
        t.wallet.name.toLowerCase().includes(filter.search.toLowerCase())
      )
    : transactions

  return (
    <div className="space-y-3">
      {/* Row 1: Period tabs + Add button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-x-auto pb-0.5">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 text-xs w-max">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => {
                  setPeriod(p.key); setOffset(0); setPage(1)
                  if (p.key === 'range') setShowRangePicker(true)
                  else setShowRangePicker(false)
                }}
                className={`px-2.5 py-1.5 font-medium transition flex items-center gap-1 whitespace-nowrap ${
                  period === p.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {p.key === 'range' && <CalendarRange className="w-3 h-3" />}
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Row 2: Prev/Next nav + Totals */}
      {period !== 'all' && period !== 'range' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => { setOffset(o => o - 1); setPage(1) }}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-24 text-center">{periodLabel}</span>
            <button onClick={() => { setOffset(o => o + 1); setPage(1) }}
              disabled={offset >= 0}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {transactions.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-600 font-semibold">+{formatCurrency(periodTotals.income)}</span>
              <span className="text-red-500 font-semibold">−{formatCurrency(periodTotals.expense)}</span>
              <span className={`font-bold ${periodTotals.income - periodTotals.expense >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                {formatCurrency(periodTotals.income - periodTotals.expense)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Custom range picker */}
      {period === 'range' && showRangePicker && (
        <div className="grid grid-cols-2 gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={() => setShowRangePicker(false)} disabled={!customFrom || !customTo}
            className="col-span-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition disabled:opacity-40">
            Apply
          </button>
        </div>
      )}

      {/* Row 3: Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search note, category or wallet…"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-900 focus:outline-none"
            value={filter.type}
            onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(1) }}
          >
            {TYPES.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
          </select>
          <select
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-900 focus:outline-none"
            value={filter.walletId}
            onChange={e => { setFilter(f => ({ ...f, walletId: e.target.value })); setPage(1) }}
          >
            <option value="">All wallets</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-900 focus:outline-none"
            value={filter.categoryId}
            onChange={e => { setFilter(f => ({ ...f, categoryId: e.target.value })); setPage(1) }}
          >
            <option value="">All categories</option>
            {categories.flatMap(cat => [
              <option key={cat.id} value={cat.id}>{cat.name}</option>,
              ...(cat.subcategories ?? []).map(sub => (
                <option key={sub.id} value={sub.id}>&nbsp;&nbsp;↳ {sub.name}</option>
              )),
            ])}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {displayed.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No transactions found</div>
          )}
          {displayed.map(tx => (
            <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: tx.category?.color ?? '#6b7280' }}
                >
                  {tx.type === 'TRANSFER' ? '↔' : (tx.category?.name ?? tx.wallet.name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {tx.type === 'TRANSFER'
                      ? `${tx.wallet.name} → ${tx.transferToWallet?.name ?? '?'}`
                      : (tx.category?.parent?.name ? `${tx.category.parent.name} / ` : '') + (tx.category?.name ?? 'Uncategorized')}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tx.wallet.name} · {formatDate(tx.date)}{tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '' : '-'}{formatCurrency(tx.amount)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setEditing(tx)}
                    className="p-1 text-gray-400 hover:text-indigo-500 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {total > 50 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400">{total} total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1 rounded border disabled:opacity-30">Prev</button>
              <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1 rounded border disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadTransactions() }}
        />
      )}

      {editing && (
        <TransactionForm
          wallets={wallets}
          categories={categories}
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadTransactions() }}
        />
      )}
    </div>
  )
}

function TransactionForm({ wallets, categories, transaction, onClose, onSaved }: {
  wallets: Wallet[]
  categories: Category[]
  transaction?: Transaction
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!transaction

  // Default wallet: pre-filled from transaction, or first wallet named "Main", or first wallet
  const defaultWalletId = transaction?.walletId
    ?? wallets.find(w => w.name.toLowerCase() === 'main')?.id
    ?? wallets[0]?.id
    ?? ''

  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(transaction?.type ?? 'EXPENSE')
  const [walletId, setWalletId] = useState(defaultWalletId)
  const [transferToWalletId, setTransferToWalletId] = useState(transaction?.transferToWalletId ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(
    transaction ? transaction.date.split('T')[0] : format(new Date(), 'yyyy-MM-dd')
  )
  const [note, setNote] = useState(transaction?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCalc, setShowCalc] = useState(false)

  const filteredCats = categories.filter(c => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE') || !c.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (type === 'TRANSFER' && !transferToWalletId) {
      setError('Please select a destination wallet for the transfer.')
      return
    }
    setSaving(true)
    const payload = {
      walletId,
      categoryId: categoryId || null,
      type,
      amount: parseFloat(amount),
      transferToWalletId: type === 'TRANSFER' ? transferToWalletId : null,
      date,
      note: note || null,
    }
    try {
      const res = isEdit
        ? await fetch(`/api/transactions/${transaction!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const errMsg = typeof body.error === 'string'
          ? body.error
          : Array.isArray(body.error)
            ? body.error.map((e: { message: string }) => e.message).join(', ')
            : 'Failed to save. Please try again.'
        setError(errMsg)
        setSaving(false)
        return
      }
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h2>

        {/* Type tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
          {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 text-sm font-medium transition ${type === t ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{type === 'TRANSFER' ? 'From Wallet' : 'Wallet'}</label>
              <select value={walletId} onChange={e => setWalletId(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none">
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            {type === 'TRANSFER' ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">To Wallet</label>
                <select required value={transferToWalletId} onChange={e => setTransferToWalletId(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none">
                  <option value="" disabled>Select wallet</option>
                  {wallets.filter(w => w.id !== walletId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category / Subcategory</label>
                <CategoryPicker
                  categories={filteredCats}
                  value={categoryId}
                  onChange={setCategoryId}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount</label>
            <div className="relative">
              <input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-9 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00" />
              <button
                type="button"
                onClick={() => setShowCalc(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition"
                title="Open calculator"
              >
                <Calculator className="w-4 h-4" />
              </button>
            </div>
            {showCalc && (
              <CalcModal
                initial={amount}
                onDone={(val) => { setAmount(val); setShowCalc(false) }}
                onClose={() => setShowCalc(false)}
              />
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <DatePicker value={date} onChange={setDate} required />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional" />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Calculator Modal ─────────────────────────────────────────────────── */

function CalcModal({ initial, onDone, onClose }: {
  initial: string
  onDone: (val: string) => void
  onClose: () => void
}) {
  const [expr, setExpr] = useState(initial || '')
  const [display, setDisplay] = useState(initial || '0')

  function press(key: string) {
    if (key === 'C') { setExpr(''); setDisplay('0'); return }
    if (key === '⌫') {
      const next = expr.slice(0, -1)
      setExpr(next)
      setDisplay(next || '0')
      return
    }
    if (key === '=') {
      try {
        // Safe eval: only digits and operators
        const safe = expr.replace(/[^0-9+\-*/.()]/g, '')
        // eslint-disable-next-line no-new-func
        const result = new Function('return ' + safe)()
        const rounded = parseFloat(result.toFixed(2))
        setDisplay(String(rounded))
        setExpr(String(rounded))
      } catch {
        setDisplay('Error')
      }
      return
    }
    const next = expr + key
    setExpr(next)
    setDisplay(next)
  }

  const rows = [
    ['C', '⌫', '(', ')'],
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ]

  const isOp = (k: string) => ['+', '-', '*', '/'].includes(k)
  const isAction = (k: string) => ['C', '⌫', '(', ')'].includes(k)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xs p-4 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Display */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-right">
          <p className="text-xs text-gray-400 truncate min-h-[16px]">{expr || ' '}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{display}</p>
        </div>

        {/* Keys */}
        <div className="grid grid-cols-4 gap-2">
          {rows.flat().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className={`
                h-12 rounded-xl text-sm font-semibold transition active:scale-95
                ${key === '='
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white col-span-1'
                  : isOp(key)
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60'
                    : isAction(key)
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              // If display shows a valid number, use it
              const num = parseFloat(display)
              if (!isNaN(num) && num > 0) onDone(String(parseFloat(num.toFixed(2))))
            }}
            className="flex-1 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
          >
            Use ৳{isNaN(parseFloat(display)) ? '–' : parseFloat(display).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}

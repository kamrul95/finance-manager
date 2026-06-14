'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Pencil, Wallet, SlidersHorizontal, Calculator } from 'lucide-react'

interface WalletItem {
  id: string; name: string; type: string; currency: string
  balance: number; color: string; isExcluded: boolean
}

const WALLET_TYPES = ['CASH', 'BANK', 'MOBILE_BANKING', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'DEBT', 'OTHER']
const TYPE_LABELS: Record<string, string> = {
  CASH: 'Cash', BANK: 'Bank', MOBILE_BANKING: 'Mobile Banking',
  CREDIT_CARD: 'Credit Card', SAVINGS: 'Savings', INVESTMENT: 'Investment', DEBT: 'Debt', OTHER: 'Other'
}
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WalletItem | null>(null)
  const [adjusting, setAdjusting] = useState<WalletItem | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/wallets')
    const data = await res.json()
    setWallets(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteWallet(id: string) {
    if (!confirm('Archive this wallet? It will be hidden everywhere but your transaction history is kept.')) return
    await fetch(`/api/wallets/${id}`, { method: 'DELETE' })
    load()
  }

  const netWorth = wallets.filter(w => !w.isExcluded).reduce((s, w) => s + w.balance, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Total Net Worth</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(netWorth)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Wallet
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map(w => (
          <div key={w.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-start justify-between group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: w.color + '20' }}>
                <Wallet className="w-5 h-5" style={{ color: w.color }} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{w.name}</p>
                <p className="text-xs text-gray-400">{TYPE_LABELS[w.type] ?? w.type} · {w.currency}</p>
                {w.isExcluded && <span className="text-xs text-orange-500">Excluded from net worth</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-sm font-bold ${w.balance < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {formatCurrency(w.balance, w.currency)}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setAdjusting(w)} className="p-1 text-gray-400 hover:text-green-500 transition" title="Adjust balance">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <button onClick={() => setEditing(w)} className="p-1 text-gray-400 hover:text-indigo-500 transition" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteWallet(w.id)} className="p-1 text-gray-400 hover:text-red-500 transition" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <WalletForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}

      {editing && (
        <WalletForm
          wallet={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      {adjusting && (
        <AdjustBalanceModal
          wallet={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => { setAdjusting(null); load() }}
        />
      )}
    </div>
  )
}

function AdjustBalanceModal({ wallet, onClose, onSaved }: {
  wallet: WalletItem
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'set' | 'add' | 'subtract'>('set')
  const [amount, setAmount] = useState(String(wallet.balance))
  const [saving, setSaving] = useState(false)

  const preview = (() => {
    const val = parseFloat(amount) || 0
    if (mode === 'set') return val
    if (mode === 'add') return wallet.balance + val
    return wallet.balance - val
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/wallets/${wallet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: preview }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-1">Adjust Balance</h2>
        <p className="text-xs text-gray-400 mb-4">{wallet.name} · current: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(wallet.balance, wallet.currency)}</span></p>

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs mb-4">
          {([['set', 'Set to'], ['add', '+ Add'], ['subtract', '− Subtract']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => { setMode(key); setAmount('') }}
              className={`flex-1 py-1.5 font-medium transition ${mode === key ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {mode === 'set' ? 'New balance' : mode === 'add' ? 'Amount to add' : 'Amount to subtract'}
            </label>
            <input
              type="number" step="0.01" required autoFocus
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>

          {/* Preview */}
          {amount !== '' && (
            <div className="text-sm text-center py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              New balance will be{' '}
              <span className={`font-bold ${preview < 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                {formatCurrency(preview, wallet.currency)}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WalletForm({ wallet, onClose, onSaved }: {
  wallet?: WalletItem
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!wallet
  const [name, setName] = useState(wallet?.name ?? '')
  const [type, setType] = useState(wallet?.type ?? 'CASH')
  const [currency, setCurrency] = useState(wallet?.currency ?? 'BDT')
  const [balance, setBalance] = useState(String(wallet?.balance ?? '0'))
  const [color, setColor] = useState(wallet?.color ?? COLORS[0])
  const [isExcluded, setIsExcluded] = useState(wallet?.isExcluded ?? false)
  const [saving, setSaving] = useState(false)
  const [showCalc, setShowCalc] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (isEdit) {
      await fetch(`/api/wallets/${wallet!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, currency, color, isExcluded }),
      })
    } else {
      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, currency, balance: parseFloat(balance), color, isExcluded }),
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">{isEdit ? 'Edit Wallet' : 'Add Wallet'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. bKash, City Bank"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none">
                {WALLET_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Currency</label>
              <input value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none"
                placeholder="BDT"
              />
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opening Balance</label>
              <div className="relative">
                <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-9 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  initial={balance}
                  onDone={(val) => { setBalance(val); setShowCalc(false) }}
                  onClose={() => setShowCalc(false)}
                />
              )}
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={isExcluded} onChange={e => setIsExcluded(e.target.checked)} className="rounded" />
            Exclude from net worth
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
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
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-right">
          <p className="text-xs text-gray-400 truncate min-h-[16px]">{expr || ' '}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{display}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {rows.flat().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className={`
                h-12 rounded-xl text-sm font-semibold transition active:scale-95
                ${key === '='
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
              const num = parseFloat(display)
              if (!isNaN(num)) onDone(String(parseFloat(num.toFixed(2))))
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

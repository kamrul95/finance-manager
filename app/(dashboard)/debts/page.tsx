'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Check, Trash2 } from 'lucide-react'

interface Debt {
  id: string; personName: string; direction: 'LENT' | 'BORROWED'
  amount: number; currency: string; dueDate: string | null; isSettled: boolean; note: string | null
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'active' | 'settled'>('active')

  const load = useCallback(() => {
    fetch('/api/debts').then(r => r.json()).then(setDebts)
  }, [])

  useEffect(() => { load() }, [load])

  async function settle(id: string) {
    await fetch(`/api/debts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSettled: true }),
    })
    load()
  }

  async function deleteDebt(id: string) {
    await fetch(`/api/debts/${id}`, { method: 'DELETE' })
    load()
  }

  const active = debts.filter(d => !d.isSettled)
  const settled = debts.filter(d => d.isSettled)
  const displayed = tab === 'active' ? active : settled

  const totalLent = active.filter(d => d.direction === 'LENT').reduce((s, d) => s + d.amount, 0)
  const totalBorrowed = active.filter(d => d.direction === 'BORROWED').reduce((s, d) => s + d.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-300 mb-1">People owe you</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalLent)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300 mb-1">You owe others</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalBorrowed)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['active', 'settled'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {t} ({t === 'active' ? active.length : settled.length})
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {displayed.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No {tab} debts</div>
        )}
        {displayed.map(debt => (
          <div key={debt.id} className="flex items-center justify-between px-5 py-3 group">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${debt.direction === 'LENT' ? 'bg-green-500' : 'bg-red-500'}`}>
                {debt.personName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {debt.direction === 'LENT' ? `${debt.personName} owes you` : `You owe ${debt.personName}`}
                </p>
                <p className="text-xs text-gray-400">
                  {debt.dueDate ? `Due ${formatDate(debt.dueDate)}` : 'No due date'}
                  {debt.note ? ` · ${debt.note}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${debt.direction === 'LENT' ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(debt.amount, debt.currency)}
              </span>
              {!debt.isSettled && (
                <button onClick={() => settle(debt.id)} className="opacity-0 group-hover:opacity-100 p-1 text-green-500 hover:text-green-700 transition" title="Mark settled">
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => deleteDebt(debt.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <DebtForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
      )}
    </div>
  )
}

function DebtForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [personName, setPersonName] = useState('')
  const [direction, setDirection] = useState<'LENT' | 'BORROWED'>('LENT')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personName, direction, amount: parseFloat(amount), dueDate: dueDate || null, note }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">Add Debt Record</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-1">
            {(['LENT', 'BORROWED'] as const).map(d => (
              <button key={d} type="button" onClick={() => setDirection(d)}
                className={`flex-1 py-2 text-sm font-medium transition ${direction === d ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {d === 'LENT' ? 'I Lent' : 'I Borrowed'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Person Name</label>
            <input required value={personName} onChange={e => setPersonName(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (BDT)</label>
            <input type="number" min="1" required value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

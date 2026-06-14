'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Target } from 'lucide-react'

interface Goal {
  id: string; name: string; targetAmount: number; currentAmount: number
  currency: string; deadline: string | null; note: string | null
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [contribute, setContribute] = useState<Goal | null>(null)

  const load = useCallback(() => {
    fetch('/api/goals').then(r => r.json()).then(setGoals)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    load()
  }

  async function addContribution(goal: Goal, amount: number) {
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentAmount: goal.currentAmount + amount }),
    })
    setContribute(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.length === 0 && (
          <div className="col-span-2 py-12 text-center text-sm text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            No goals yet. Add a savings goal to start!
          </div>
        )}
        {goals.map(goal => {
          const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
          const done = goal.currentAmount >= goal.targetAmount
          return (
            <div key={goal.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${done ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                    <Target className={`w-5 h-5 ${done ? 'text-green-600' : 'text-indigo-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{goal.name}</p>
                    {goal.deadline && <p className="text-xs text-gray-400">Due {formatDate(goal.deadline)}</p>}
                  </div>
                </div>
                <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatCurrency(goal.currentAmount, goal.currency)}</span>
                  <span>{formatCurrency(goal.targetAmount, goal.currency)}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400">{pct.toFixed(0)}% complete</p>
              </div>
              {!done && (
                <button onClick={() => setContribute(goal)}
                  className="w-full text-xs text-indigo-600 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg py-1.5 transition">
                  + Add contribution
                </button>
              )}
              {done && <p className="text-xs text-center text-green-600 font-medium">Goal reached! 🎉</p>}
            </div>
          )
        })}
      </div>

      {showForm && (
        <GoalForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />
      )}
      {contribute && (
        <ContributeModal goal={contribute} onClose={() => setContribute(null)} onSaved={(amount) => addContribution(contribute, amount)} />
      )}
    </div>
  )
}

function GoalForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetAmount: parseFloat(targetAmount), deadline: deadline || null, note }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">New Savings Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Goal Name</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Emergency fund, Laptop"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target Amount (BDT)</label>
            <input type="number" min="1" required value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Deadline (optional)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
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

function ContributeModal({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: (amount: number) => void }) {
  const [amount, setAmount] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-1">Contribute to &ldquo;{goal.name}&rdquo;</h2>
        <p className="text-xs text-gray-400 mb-4">{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</p>
        <input type="number" min="1" autoFocus value={amount} onChange={e => setAmount(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          placeholder="Amount"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
          <button
            onClick={() => amount && onSaved(parseFloat(amount))}
            className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

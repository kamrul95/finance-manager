'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

interface Budget {
  id: string; name: string; amount: number; currency: string; period: string; rollover: boolean; spent: number
  category?: { name: string; color: string } | null
}
interface Category { id: string; name: string }

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)

  async function load() {
    fetch('/api/budgets').then(r => r.json()).then(setBudgets)
    fetch('/api/categories?type=EXPENSE').then(r => r.json()).then(setCategories)
  }

  useEffect(() => { load() }, [])

  async function deleteBudget(id: string) {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
    load()
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">This Month — Spent / Budgeted</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpent)} <span className="text-gray-400 font-normal text-base">/ {formatCurrency(totalBudgeted)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Budget
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {budgets.length === 0 && (
          <div className="col-span-2 py-12 text-center text-sm text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            No budgets yet. Add one to start tracking.
          </div>
        )}
        {budgets.map(budget => {
          const pct = Math.min((budget.spent / budget.amount) * 100, 100)
          const over = budget.spent > budget.amount
          return (
            <div key={budget.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{budget.name}</p>
                  {budget.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block text-white" style={{ backgroundColor: budget.category.color }}>
                      {budget.category.name}
                    </span>
                  )}
                </div>
                <button onClick={() => deleteBudget(budget.id)} className="text-gray-300 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatCurrency(budget.spent)} spent</span>
                  <span className={over ? 'text-red-500 font-semibold' : ''}>{formatCurrency(budget.amount)} budget</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-orange-400' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`text-xs ${over ? 'text-red-500' : 'text-gray-400'}`}>
                  {over ? `Over by ${formatCurrency(budget.spent - budget.amount)}` : `${formatCurrency(budget.amount - budget.spent)} remaining`}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <BudgetForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function BudgetForm({ categories, onClose, onSaved }: { categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('MONTHLY')
  const [rollover, setRollover] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, categoryId: categoryId || null, amount: parseFloat(amount), period, rollover }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">Add Budget</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Budget Name</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Monthly Groceries"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category (optional)</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none">
              <option value="">Overall budget</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (BDT)</label>
              <input type="number" min="1" required value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none">
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={rollover} onChange={e => setRollover(e.target.checked)} className="rounded" />
            Rollover unspent to next period
          </label>
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

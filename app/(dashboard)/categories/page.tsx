'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ChevronRight, Pencil } from 'lucide-react'

interface Category {
  id: string; name: string; type: 'EXPENSE' | 'INCOME'; color: string; icon: string
  subcategories: Category[]
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [tab, setTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  // null = add new parent; Category object = edit subcategories of that parent
  const [editingParent, setEditingParent] = useState<Category | null | undefined>(undefined)
  // Category being renamed
  const [renamingCat, setRenamingCat] = useState<Category | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/categories?type=${tab}`)
    setCategories(await res.json())
  }, [tab])

  useEffect(() => { load() }, [load])

  async function deleteCategory(id: string, hasSubs = false) {
    if (!confirm(hasSubs ? 'Delete this category and all its subcategories?' : 'Delete this subcategory?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['EXPENSE', 'INCOME'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditingParent(null)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {categories.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No categories yet</div>
        )}
        {categories.map(cat => (
          <div key={cat.id}>
            {/* Parent category row */}
            <div className="flex items-center justify-between px-5 py-3 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: cat.color }}>
                  {cat.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</span>
                {cat.subcategories.length > 0 && (
                  <span className="text-xs text-gray-400">{cat.subcategories.length} subcategories</span>
                )}
              </div>
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => setRenamingCat(cat)}
                  className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
                  title="Edit category"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => setEditingParent(cat)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  title="Edit subcategories"
                >
                  <Pencil className="w-3 h-3" />
                  {cat.subcategories.length > 0 ? 'Edit subs' : 'Add subs'}
                </button>
                <button onClick={() => deleteCategory(cat.id, cat.subcategories.length > 0)} className="text-gray-300 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subcategory rows */}
            {cat.subcategories.map(sub => (
              <div key={sub.id} className="flex items-center justify-between pl-16 pr-5 py-2.5 group bg-gray-50/50 dark:bg-gray-800/20">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: sub.color }}>
                    {sub.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{sub.name}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => setRenamingCat(sub)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteCategory(sub.id)} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add new parent category */}
      {editingParent === null && (
        <NewCategoryForm
          type={tab}
          onClose={() => setEditingParent(undefined)}
          onSaved={() => { setEditingParent(undefined); load() }}
        />
      )}

      {/* Edit subcategories of an existing parent */}
      {editingParent && (
        <SubcategoryEditor
          parent={editingParent}
          type={tab}
          onClose={() => setEditingParent(undefined)}
          onSaved={() => { setEditingParent(undefined); load() }}
        />
      )}

      {/* Rename/recolor a category or subcategory */}
      {renamingCat && (
        <RenameCategoryForm
          category={renamingCat}
          onClose={() => setRenamingCat(null)}
          onSaved={() => { setRenamingCat(null); load() }}
        />
      )}
    </div>
  )
}

// ── Add new parent category ──────────────────────────────────────────────────
function NewCategoryForm({ type, onClose, onSaved }: {
  type: 'EXPENSE' | 'INCOME'; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, color, parentId: null }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">Add {type} Category</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              required autoFocus value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Groceries"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit subcategories of an existing parent ─────────────────────────────────
function SubcategoryEditor({ parent, type, onClose, onSaved }: {
  parent: { id: string; name: string; color: string; subcategories: { id: string; name: string; color: string }[] }
  type: 'EXPENSE' | 'INCOME'; onClose: () => void; onSaved: () => void
}) {
  const existingSubs = parent.subcategories

  // Pre-fill textarea with existing subcategory names
  const initialText = existingSubs.length > 0
    ? existingSubs.map(s => `* ${s.name}`).join('\n') + '\n* '
    : '* '

  const [bulkText, setBulkText] = useState(initialText)
  const [color, setColor] = useState(parent.color)
  const [saving, setSaving] = useState(false)

  function parseLines(text: string): string[] {
    return text
      .split('\n')
      .map(l => l.replace(/^\s*\*\s*/, '').trim())
      .filter(Boolean)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      setBulkText(t => t + '\n* ')
    }
  }

  const newNames = parseLines(bulkText)
  const oldNames = existingSubs.map(s => s.name)

  // What will happen on save
  const toCreate = newNames.filter(n => !oldNames.includes(n))
  const toDelete = existingSubs.filter(s => !newNames.includes(s.name))
  const unchanged = newNames.filter(n => oldNames.includes(n))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Create new subcategories
    for (const subName of toCreate) {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subName, type, color, parentId: parent.id }),
      })
    }

    // Delete removed subcategories
    for (const sub of toDelete) {
      await fetch(`/api/categories/${sub.id}`, { method: 'DELETE' })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Subcategories of &ldquo;{parent.name}&rdquo;</h2>
          <p className="text-xs text-gray-400 mt-0.5">Edit names inline · add new lines · delete a line to remove</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            autoFocus
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.max(6, newNames.length + 2)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed resize-none"
            placeholder={'* Vegetables\n* Fish & Meat\n* Fruits'}
          />

          {/* Live diff summary */}
          {(toCreate.length > 0 || toDelete.length > 0) && (
            <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 space-y-1">
              {toCreate.length > 0 && (
                <p className="text-xs text-green-600">
                  + Add: {toCreate.join(', ')}
                </p>
              )}
              {toDelete.length > 0 && (
                <p className="text-xs text-red-500">
                  − Remove: {toDelete.map(s => s.name).join(', ')}
                </p>
              )}
              {unchanged.length > 0 && (
                <p className="text-xs text-gray-400">
                  ✓ Keep: {unchanged.length} unchanged
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-2">Color for new subcategories</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (toCreate.length === 0 && toDelete.length === 0)}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Save${toCreate.length + toDelete.length > 0 ? ` (${toCreate.length + toDelete.length} changes)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Rename / recolor a single category or subcategory ────────────────────────
function RenameCategoryForm({ category, onClose, onSaved }: {
  category: { id: string; name: string; color: string }
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [saving, setSaving] = useState(false)

  const unchanged = name.trim() === category.name && color === category.color

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (unchanged) { onClose(); return }
    setSaving(true)
    await fetch(`/api/categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">Edit Category</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              required autoFocus value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : unchanged ? 'No changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

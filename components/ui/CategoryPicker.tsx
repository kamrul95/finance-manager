'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, ArrowLeft, X } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
  subcategories: { id: string; name: string; color: string }[]
}

interface CategoryPickerProps {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}

export default function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCat, setActiveCat] = useState<Category | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset to parent list on open
  useEffect(() => {
    if (open) setActiveCat(null)
  }, [open])

  // Resolve display label for trigger
  let selectedLabel = 'No category'
  let selectedColor = ''
  for (const cat of categories) {
    if (cat.id === value) { selectedLabel = cat.name; selectedColor = cat.color; break }
    for (const sub of cat.subcategories ?? []) {
      if (sub.id === value) {
        selectedLabel = `${cat.name} / ${sub.name}`
        selectedColor = sub.color
        break
      }
    }
  }

  function pickParent(cat: Category) {
    if ((cat.subcategories ?? []).length === 0) {
      onChange(cat.id)
      setOpen(false)
    } else {
      setActiveCat(cat)
    }
  }

  function pickItem(id: string) {
    onChange(id)
    setOpen(false)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 hover:border-indigo-400 transition text-left"
      >
        {selectedColor && (
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedColor }} />
        )}
        <span className={`flex-1 truncate ${value ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
          {selectedLabel}
        </span>
        {value ? (
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 shrink-0" onClick={clear} />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">

            {/* ── PARENT LIST ── */}
            {!activeCat && (
              <>
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition ${
                    value === ''
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  No category
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => pickParent(cat)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition ${
                      value === cat.id || (cat.subcategories ?? []).some(s => s.id === value)
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                        : 'text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 truncate">{cat.name}</span>
                    {(cat.subcategories ?? []).length > 0 && (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* ── SUBCATEGORY LIST ── */}
            {activeCat && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveCat(null)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-indigo-600 border-b border-gray-100 dark:border-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeCat.color }} />
                  {activeCat.name}
                </button>

                <button
                  type="button"
                  onClick={() => pickItem(activeCat.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition ${
                    value === activeCat.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeCat.color }} />
                  {activeCat.name}
                  <span className="text-xs text-gray-400">(general)</span>
                </button>

                {(activeCat.subcategories ?? []).map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => pickItem(sub.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition ${
                      value === sub.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                    {sub.name}
                  </button>
                ))}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

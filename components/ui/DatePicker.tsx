'use client'

import { format, addDays, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useRef } from 'react'

interface DatePickerProps {
  value: string        // yyyy-MM-dd
  onChange: (val: string) => void
  showQuickDays?: boolean
  required?: boolean
  allowFuture?: boolean
}

export default function DatePicker({ value, onChange, showQuickDays = true, required, allowFuture = false }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const today     = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')

  const label = !value         ? 'Select date'
    : value === today          ? 'Today'
    : value === yesterday      ? 'Yesterday'
    : format(parseISO(value), 'EEE, MMM d yyyy')

  function shift(days: number) {
    const base = value ? parseISO(value) : new Date()
    onChange(format(addDays(base, days), 'yyyy-MM-dd'))
  }

  function openPicker() {
    const el = inputRef.current
    if (!el) return
    try { el.showPicker() } catch { el.click() }
  }

  return (
    <div className="space-y-1.5">
      {/* Quick-day chips */}
      {showQuickDays && (
        <div className="flex gap-1.5">
          {[
            { label: 'Today',     val: today },
            { label: 'Yesterday', val: yesterday },
          ].map(({ label: l, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                value === val
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Nav row */}
      <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="flex-1 text-center text-sm font-medium text-gray-800 dark:text-white select-none">
          {label}
        </span>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!allowFuture && value >= today}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

        <button
          type="button"
          onClick={openPicker}
          className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
          title="Pick a date"
        >
          <CalendarDays className="w-4 h-4" />
        </button>

        {/* Hidden native date input — triggered by calendar icon */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          max={allowFuture ? undefined : today}
          required={required}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}

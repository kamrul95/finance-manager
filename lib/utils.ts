import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'BDT') {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(date))
}

// ── Bangladesh timezone helpers (UTC+6, no DST) ──────────────────────────────

const BD_OFFSET = '+06:00'

/** Interpret a YYYY-MM-DD string as Bangladesh midnight → UTC Date */
export function bdStartOfDay(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00' + BD_OFFSET)
}

/** Interpret a YYYY-MM-DD string as Bangladesh end-of-day → UTC Date */
export function bdEndOfDay(dateStr: string): Date {
  return new Date(dateStr + 'T23:59:59.999' + BD_OFFSET)
}

/** Convert any Date / string from Excel or form into a BD-midnight UTC Date */
export function parseDateBD(value: Date | number | string): Date {
  if (value instanceof Date) {
    // ExcelJS gives a JS Date — its local year/month/day is what we want
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return bdStartOfDay(`${y}-${m}-${d}`)
  }
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return bdStartOfDay(s.slice(0, 10))
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear()
    const mo = String(dt.getMonth() + 1).padStart(2, '0')
    const dy = String(dt.getDate()).padStart(2, '0')
    return bdStartOfDay(`${y}-${mo}-${dy}`)
  }
  return new Date(s)
}

/** Current month boundaries in Bangladesh time */
export function getMonthRange() {
  const now = new Date(Date.now() + 6 * 60 * 60 * 1000) // shift to BD clock
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const lastDay = new Date(Date.UTC(y, now.getUTCMonth() + 1, 0)).getUTCDate()
  return {
    start: bdStartOfDay(`${y}-${m}-01`),
    end:   bdEndOfDay(`${y}-${m}-${String(lastDay).padStart(2, '0')}`),
  }
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import {
  Tag, PiggyBank, Target, Users, Upload, Settings
} from 'lucide-react'

const primary = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

const more = [
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/debts', label: 'Debts', icon: Users },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex safe-bottom">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors',
                active ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Icon className={cn('w-5 h-5', active ? 'text-indigo-600' : '')} />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* More drawer */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMore(false)} />
          <div className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-8">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {more.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors',
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

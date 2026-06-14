'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/wallets', label: 'Wallets' },
  { href: '/categories', label: 'Categories' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/goals', label: 'Goals' },
  { href: '/debts', label: 'Debts' },
  { href: '/reports', label: 'Reports' },
  { href: '/import', label: 'Import' },
  { href: '/settings', label: 'Settings' },
]

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const title = nav.find(n => n.href === pathname)?.label ?? 'Finance Manager'

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <h1 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h1>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </header>
  )
}

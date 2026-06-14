'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-900 dark:text-white">{email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Default Currency</h2>
        <p className="text-sm text-gray-500">BDT (Bangladeshi Taka) — all amounts are displayed in BDT.</p>
        <p className="text-xs text-gray-400 mt-1">Multi-currency support: you can set a different currency per wallet.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Data</h2>
        <p className="text-sm text-gray-500 mb-3">Import your existing Money Manager data from the Import page.</p>
        <a href="/import" className="text-sm text-indigo-600 hover:underline">Go to Import →</a>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportResult {
  imported: number; skipped: number; errors: string[]
  walletsCreated: string[]; categoriesCreated: string[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Import failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Import failed. Make sure the file is a valid Money Manager export.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Import from Money Manager</h2>
        <p className="text-sm text-gray-500">Upload the .xlsx file exported from Money Manager Expense & Budget. Your existing wallets, categories, and transactions will be preserved — new ones will be created automatically.</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${file ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-3 ${file ? 'text-indigo-500' : 'text-gray-400'}`} />
        {file ? (
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{file.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">Click to select your .xlsx file</p>
            <p className="text-xs text-gray-400 mt-1">Only Money Manager export format is supported</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <button
        onClick={handleImport}
        disabled={!file || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-sm font-medium rounded-lg transition disabled:opacity-40"
      >
        {loading ? 'Importing…' : 'Start Import'}
      </button>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Import Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
              <p className="text-xs text-green-600 mb-0.5">Imported</p>
              <p className="font-bold text-green-700">{result.imported} transactions</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Skipped</p>
              <p className="font-bold text-gray-700 dark:text-gray-300">{result.skipped} rows</p>
            </div>
          </div>
          {result.walletsCreated.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">New wallets created: {result.walletsCreated.length}</p>
              <p className="text-xs text-gray-400">{result.walletsCreated.join(', ')}</p>
            </div>
          )}
          {result.categoriesCreated.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">New categories created: {result.categoriesCreated.length}</p>
              <p className="text-xs text-gray-400">{result.categoriesCreated.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

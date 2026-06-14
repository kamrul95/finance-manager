import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { parseDateBD } from '@/lib/utils'
import ExcelJS, { type Worksheet } from 'exceljs'

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
  walletsCreated: string[]
  categoriesCreated: string[]
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer as Buffer)

    const result: ImportResult = { imported: 0, skipped: 0, errors: [], walletsCreated: [], categoriesCreated: [] }

    // Cache wallets and categories for this user
    const walletCache: Record<string, string> = {}
    const categoryCache: Record<string, string> = {}

    async function getOrCreateWallet(name: string): Promise<string | null> {
      if (!name) return null
      if (walletCache[name]) return walletCache[name]
      let wallet = await prisma.wallet.findFirst({ where: { userId: user.id, name } })
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId: user.id, name, type: 'CASH', currency: 'BDT', balance: 0, color: '#6366f1', icon: 'wallet' },
        })
        result.walletsCreated.push(name)
      }
      walletCache[name] = wallet.id
      return wallet.id
    }

    const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b']
    let colorIdx = 0
    function nextColor() { return COLORS[colorIdx++ % COLORS.length] }

    async function getOrCreateCategory(
      parentName: string,
      subName: string,
      type: 'EXPENSE' | 'INCOME'
    ): Promise<string | null> {
      if (!parentName) return null

      const parentKey = `${type}:${parentName}`
      let parentId: string

      if (categoryCache[parentKey]) {
        parentId = categoryCache[parentKey]
      } else {
        let parent = await prisma.category.findFirst({
          where: { userId: user.id, name: parentName, type, parentId: null },
        })
        if (!parent) {
          parent = await prisma.category.create({
            data: { userId: user.id, name: parentName, type, color: nextColor(), icon: 'tag', parentId: null },
          })
          result.categoriesCreated.push(parentName)
        }
        parentId = parent.id
        categoryCache[parentKey] = parentId
      }

      if (!subName) return parentId

      const subKey = `${type}:${parentName}/${subName}`
      if (categoryCache[subKey]) return categoryCache[subKey]

      let sub = await prisma.category.findFirst({
        where: { userId: user.id, name: subName, type, parentId },
      })
      if (!sub) {
        sub = await prisma.category.create({
          data: { userId: user.id, name: subName, type, color: nextColor(), icon: 'tag', parentId },
        })
        result.categoriesCreated.push(`${parentName} / ${subName}`)
      }
      categoryCache[subKey] = sub.id
      return sub.id
    }

    function detectFormat(sheet: Worksheet): 'new' | 'old' {
      const headerRow = sheet.getRow(2)
      const col3 = String(headerRow.getCell(3).value ?? '').toLowerCase()
      return col3 === 'subcategory' ? 'new' : 'old'
    }

    // Process Expenses sheet
    const expSheet = workbook.getWorksheet('Expenses')
    if (expSheet) {
      const fmt = detectFormat(expSheet)
      const offset = fmt === 'new' ? 1 : 0
      const rows = expSheet.getRows(3, expSheet.rowCount - 2) ?? []
      for (const row of rows) {
        try {
          const date = row.getCell(1).value
          const parentCat = String(row.getCell(2).value ?? '').trim()
          const subCat = fmt === 'new' ? String(row.getCell(3).value ?? '').trim() : ''
          const account = String(row.getCell(3 + offset).value ?? '').trim()
          const amount = parseFloat(String(row.getCell(4 + offset).value ?? '0'))
          const currency = String(row.getCell(5 + offset).value ?? 'BDT')
          const note = String(row.getCell(11 + offset).value ?? '')

          if (!date || !amount || !account) { result.skipped++; continue }

          const walletId = await getOrCreateWallet(account)
          if (!walletId) { result.skipped++; continue }
          const categoryId = await getOrCreateCategory(parentCat, subCat, 'EXPENSE')

          await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId: user.id, walletId, categoryId, type: 'EXPENSE', amount, currency,
                amountInDefaultCurrency: amount, defaultCurrency: currency,
                date: parseDateBD(date instanceof Date ? date : String(date)),
                note: note || null, tags: [],
              },
            })
            await tx.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } })
          })
          result.imported++
        } catch {
          result.skipped++
        }
      }
    }

    // Process Income sheet
    const incSheet = workbook.getWorksheet('Income')
    if (incSheet) {
      const fmt = detectFormat(incSheet)
      const offset = fmt === 'new' ? 1 : 0
      const rows = incSheet.getRows(3, incSheet.rowCount - 2) ?? []
      for (const row of rows) {
        try {
          const date = row.getCell(1).value
          const parentCat = String(row.getCell(2).value ?? '').trim()
          const subCat = fmt === 'new' ? String(row.getCell(3).value ?? '').trim() : ''
          const account = String(row.getCell(3 + offset).value ?? '').trim()
          const amount = parseFloat(String(row.getCell(4 + offset).value ?? '0'))
          const currency = String(row.getCell(5 + offset).value ?? 'BDT')
          const note = String(row.getCell(11 + offset).value ?? '')

          if (!date || !amount || !account) { result.skipped++; continue }

          const walletId = await getOrCreateWallet(account)
          if (!walletId) { result.skipped++; continue }
          const categoryId = await getOrCreateCategory(parentCat, subCat, 'INCOME')

          await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId: user.id, walletId, categoryId, type: 'INCOME', amount, currency,
                amountInDefaultCurrency: amount, defaultCurrency: currency,
                date: parseDateBD(date instanceof Date ? date : String(date)),
                note: note || null, tags: [],
              },
            })
            await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
          })
          result.imported++
        } catch {
          result.skipped++
        }
      }
    }

    // Process Transfers sheet
    const trSheet = workbook.getWorksheet('Transfers')
    if (trSheet) {
      const rows = trSheet.getRows(3, trSheet.rowCount - 2) ?? []
      for (const row of rows) {
        try {
          const date = row.getCell(1).value
          const outgoing = String(row.getCell(2).value ?? '')
          const incoming = String(row.getCell(3).value ?? '')
          const amount = parseFloat(String(row.getCell(4).value ?? '0'))
          const currency = String(row.getCell(5).value ?? 'BDT')
          const note = String(row.getCell(8).value ?? '')

          if (!date || !amount || !outgoing || !incoming) { result.skipped++; continue }

          const fromWalletId = await getOrCreateWallet(outgoing)
          const toWalletId = await getOrCreateWallet(incoming)
          if (!fromWalletId || !toWalletId) { result.skipped++; continue }

          await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId: user.id,
                walletId: fromWalletId,
                transferToWalletId: toWalletId,
                type: 'TRANSFER',
                amount,
                currency,
                amountInDefaultCurrency: amount,
                defaultCurrency: currency,
                date: parseDateBD(date instanceof Date ? date : String(date)),
                note: note || null,
                tags: [],
              },
            })
            await tx.wallet.update({ where: { id: fromWalletId }, data: { balance: { decrement: amount } } })
            await tx.wallet.update({ where: { id: toWalletId }, data: { balance: { increment: amount } } })
          })
          result.imported++
        } catch {
          result.skipped++
        }
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}

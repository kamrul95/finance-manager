import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// PATCH /api/categories/reorder
// body: { ids: string[] }  — ordered list of category IDs
export async function PATCH(req: Request) {
  try {
    const user = await requireUser()
    const { ids } = await req.json() as { ids: string[] }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.category.updateMany({
          where: { id, userId: user.id },
          data: { sortOrder: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

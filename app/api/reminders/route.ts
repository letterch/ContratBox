import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { countPendingReminders, getPendingRemindersForHousehold } from "@/lib/services/reminder-sync"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const household = await prisma.household.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!household) {
    return NextResponse.json({ reminders: [], count: 0 })
  }

  const [reminders, count] = await Promise.all([
    getPendingRemindersForHousehold(household.id, 25),
    countPendingReminders(household.id),
  ])

  return NextResponse.json({
    reminders: reminders.map((r) => ({
      ...r,
      dueDate: r.dueDate.toISOString(),
    })),
    count,
  })
}

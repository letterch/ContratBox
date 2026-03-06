import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/app/actions/dashboard"
import { prisma } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (session?.user?.id) {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletedAt: true },
    })
    if (!currentUser?.onboardingCompletedAt) {
      redirect("/onboarding")
    }
  }

  const dashboard = session?.user ? await getDashboardData() : null
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        session={session}
        householdName={dashboard?.household?.name}
        contractCount={dashboard?.household?.contractCount}
        memberCount={dashboard?.household?.memberCount}
      />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}

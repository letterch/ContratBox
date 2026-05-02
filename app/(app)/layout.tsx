import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/app/actions/dashboard"
import { prisma } from "@/lib/db"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { Toaster } from "@/components/ui/sonner"
import { getAccessContextForUser } from "@/lib/services/access-context"
import { toDesktopNavDtos, toMobileNavDtos } from "@/lib/services/navigation"
import { NextStepBanner } from "@/components/decision/next-step-banner"

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
  const access = session?.user?.id ? await getAccessContextForUser(session.user.id, session) : null
  const desktopNav = toDesktopNavDtos(access)
  const mobileNav = toMobileNavDtos(access)
  const planLabel = access?.planLabel ?? "Gratuit"

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        session={session}
        householdName={dashboard?.household?.name}
        contractCount={dashboard?.household?.contractCount}
        memberCount={dashboard?.household?.memberCount}
        pendingReminderCount={dashboard?.pendingReminderCount ?? 0}
        navItems={desktopNav}
        planLabel={planLabel}
      />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <NextStepBanner
          payload={dashboard?.nextStepBanner ?? null}
          showEmptyWhenNoPayload={Boolean(dashboard?.household && !dashboard?.nextStepBanner)}
        />
        {children}
      </main>
      <MobileNav navItems={mobileNav} />
      <Toaster richColors position="top-center" />
    </div>
  )
}

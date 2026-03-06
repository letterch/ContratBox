import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/app/actions/dashboard"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const completed = (session?.user as { onboardingCompletedAt?: Date | null } | undefined)?.onboardingCompletedAt
  if (session?.user && !completed) {
    redirect("/onboarding")
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

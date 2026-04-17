import { redirect } from "next/navigation"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import type { PlanFeatureKey } from "@/lib/config/plans"
import { accessCanUseModule, getAccessContextForUser, type AccessContext } from "@/lib/services/access-context"

export type AppAccessResult = {
  session: Session
  ctx: AccessContext
}

/** Session + AccessContext ; redirige si absent. */
export async function requireAccessContext(): Promise<AppAccessResult> {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const ctx = await getAccessContextForUser(session.user.id, session)
  if (!ctx) redirect("/login")
  return { session, ctx }
}

/** Vérifie un module plan ; sinon retour dashboard (pas d’URL directe sur fonction payante). */
export async function requirePlanModule(feature: PlanFeatureKey): Promise<AppAccessResult> {
  const { session, ctx } = await requireAccessContext()
  if (!accessCanUseModule(ctx, feature)) redirect("/dashboard")
  return { session, ctx }
}

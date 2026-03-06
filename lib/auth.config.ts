import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isApp = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/contracts") ||
        nextUrl.pathname.startsWith("/upload") ||
        nextUrl.pathname.startsWith("/ai") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/onboarding")
      const isAdmin = nextUrl.pathname.startsWith("/admin")

      if (isAdmin) {
        if (!isLoggedIn) return false
        if (auth?.user?.role !== "admin") return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      if (isApp) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl))
        return true
      }

      return true
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.onboardingCompletedAt = (user as { onboardingCompletedAt?: string }).onboardingCompletedAt
      }
      if (trigger === "update" && session) {
        token.onboardingCompletedAt = (session as { onboardingCompletedAt?: string }).onboardingCompletedAt
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { onboardingCompletedAt?: string }).onboardingCompletedAt = token.onboardingCompletedAt as string | undefined
      }
      return session
    },
    redirect({ url, baseUrl }) {
      // Prevent cross-origin callback URLs (ex: stale localhost:8080)
      if (url.startsWith("/")) return `${baseUrl}${url}`
      try {
        const target = new URL(url)
        const base = new URL(baseUrl)
        if (target.origin === base.origin) return url
      } catch {
        // ignore and fallback below
      }
      return `${baseUrl}/dashboard`
    },
  },
  providers: [],
}

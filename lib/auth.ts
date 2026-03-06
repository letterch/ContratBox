import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import { prisma } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"

// Backward-compatible env aliases (Railway / legacy naming).
if (!process.env.AUTH_SECRET && process.env.NEXT_AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXT_AUTH_SECRET
}
if (!process.env.AUTH_URL && process.env.NEXT_AUTH_URL) {
  process.env.AUTH_URL = process.env.NEXT_AUTH_URL
}
if (!process.env.NEXTAUTH_URL && process.env.NEXT_AUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_AUTH_URL
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "ContratBox <onboarding@resend.dev>",
    }),
  ],
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return
      const household = await prisma.household.create({
        data: {
          name: "Mon ménage",
          ownerId: user.id,
        },
      })
      await prisma.householdMember.create({
        data: {
          householdId: household.id,
          userId: user.id,
          firstName: user.name?.split(" ")[0] ?? "Utilisateur",
          lastName: user.name?.split(" ").slice(1).join(" ") ?? null,
          role: "adult",
        },
      })
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
})

declare module "next-auth" {
  interface User {
    role?: string
    onboardingCompletedAt?: string | null
  }
  interface Session {
    user: {
      id: string
      role?: string
      onboardingCompletedAt?: string | null
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string
    role?: string
    onboardingCompletedAt?: string | null
  }
}

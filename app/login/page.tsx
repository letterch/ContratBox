"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Mail, ArrowRight } from "lucide-react"

function LoginForm() {
  const [magicSent, setMagicSent] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"

  return (
    <div className="min-h-screen flex bg-[oklch(0.10_0.04_255)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] p-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.22_0.10_255)] to-[oklch(0.10_0.04_255)]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[oklch(0.58_0.18_220)] opacity-15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <span className="text-white font-bold font-mono">CB</span>
          </div>
          <span className="text-white font-semibold text-lg">ContratBox</span>
        </div>

        {/* Central copy */}
        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3 text-balance">
              Prenez le contrôle de vos contrats
            </h2>
            <p className="text-white/50 leading-relaxed">
              Rejoignez des milliers de ménages suisses qui gèrent leurs contrats intelligemment.
            </p>
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl bg-white/6 border border-white/10 p-5">
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              "ContratBox m'a permis de trouver CHF 340 d'économies annuelles en identifiant des doublons dans mes assurances."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[oklch(0.58_0.18_220)]/30 flex items-center justify-center">
                <span className="text-[oklch(0.75_0.15_220)] text-xs font-semibold">SF</span>
              </div>
              <div>
                <p className="text-white text-xs font-medium">Sophie F.</p>
                <p className="text-white/40 text-[10px]">Lausanne, Suisse</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "12'000+", label: "ménages" },
              { value: "CHF 420", label: "économies moy." },
              { value: "4.9/5", label: "satisfaction" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-bold text-lg">{s.value}</p>
                <p className="text-white/40 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/20 text-xs">© 2025 ContratBox SA · Genève, Suisse</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="text-white font-bold text-sm font-mono">CB</span>
            </div>
            <span className="text-white font-semibold">ContratBox</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Bon retour !</h1>
          <p className="text-white/50 text-sm mb-8">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="text-[oklch(0.75_0.15_220)] hover:text-[oklch(0.80_0.15_220)] transition-colors font-medium">
              Créer un compte
            </Link>
          </p>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 bg-white/8 border-white/15 text-white hover:bg-white/15 hover:text-white hover:border-white/25 rounded-xl mb-6 gap-2.5"
            disabled={loading}
            onClick={() => {
              setLoading(true)
              setError("")
              signIn("google", { callbackUrl })
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <Separator className="flex-1 bg-white/10" />
            <span className="text-white/30 text-xs">ou</span>
            <Separator className="flex-1 bg-white/10" />
          </div>

          {!magicSent ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setError("")
                if (!email.trim()) return
                setLoading(true)
                try {
                  const res = await signIn("resend", {
                    email: email.trim(),
                    callbackUrl,
                    redirect: false,
                  })
                  if (res?.error) {
                    setError(res.error === "EmailSignin" ? "Impossible d'envoyer l'email. Réessayez." : res.error)
                    setLoading(false)
                    return
                  }
                  setMagicSent(true)
                } catch {
                  setError("Une erreur est survenue.")
                }
                setLoading(false)
              }}
            >
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Adresse email</Label>
                <Input
                  type="email"
                  placeholder="vous@exemple.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/25 rounded-xl h-11 focus:border-[oklch(0.58_0.18_220)]"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-[oklch(0.58_0.18_220)] hover:bg-[oklch(0.55_0.18_220)] text-white font-semibold">
                <Mail className="w-4 h-4 mr-2" />
                Envoyer le lien magique
              </Button>
            </form>
          ) : (
            <div className="rounded-2xl bg-[oklch(0.56_0.15_162)]/10 border border-[oklch(0.56_0.15_162)]/20 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.56_0.15_162)]/15 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-5 h-5 text-[oklch(0.56_0.15_162)]" />
              </div>
              <p className="text-white font-semibold mb-1">Email envoyé !</p>
              <p className="text-white/50 text-sm">Vérifiez votre boîte email. Le lien est valable 15 minutes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[oklch(0.10_0.04_255)]">
        <div className="text-white/50 text-sm">Chargement…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Home, ArrowRight } from "lucide-react"
import { updateOnboardingAction } from "@/app/actions/onboarding"

export default function OnboardingPage() {
  const router = useRouter()
  const [householdName, setHouseholdName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!householdName.trim()) {
      setError("Donnez un nom à votre ménage.")
      return
    }
    setLoading(true)
    try {
      await updateOnboardingAction(householdName.trim())
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.10_0.04_255)]">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="text-white font-bold font-mono">CB</span>
            </div>
            <span className="text-white font-semibold text-lg">ContratBox</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Bienvenue !</h1>
          <p className="text-white/60 text-sm mb-8">
            Donnez un nom à votre ménage pour commencer. Vous pourrez ajouter des membres et des contrats ensuite.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label className="text-white/80 text-sm mb-2 block">Nom du ménage</Label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Ex: Famille Petronio"
                  className="pl-10 h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[oklch(0.58_0.18_220)] hover:bg-[oklch(0.55_0.18_220)] text-white font-semibold gap-2"
            >
              {loading ? "Enregistrement…" : "Commencer"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-white/40 text-xs mt-6 text-center">
            Vous pourrez modifier le nom et les membres dans Paramètres.
          </p>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Features = {
  mortgageSimulatorEnabled: boolean
  mortgageSimulatorProOnly: boolean
  leaseInsightsEnabled: boolean
  globalSavingsAssistantEnabled: boolean
  optimizerHousingRatioTarget: number
  optimizerTelecomMonthlyTarget: number
  optimizerEnergyMonthlyTarget: number
}

const defaults: Features = {
  mortgageSimulatorEnabled: true,
  mortgageSimulatorProOnly: true,
  leaseInsightsEnabled: true,
  globalSavingsAssistantEnabled: true,
  optimizerHousingRatioTarget: 35,
  optimizerTelecomMonthlyTarget: 90,
  optimizerEnergyMonthlyTarget: 180,
}

export function FeatureFlagsCard() {
  const [features, setFeatures] = useState<Features>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/features")
      .then((r) => r.json())
      .then((data) => setFeatures(data?.features ?? defaults))
      .catch(() => setError("Impossible de charger la configuration"))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      })
      if (!res.ok) throw new Error("save")
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setError("Échec de sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <h3 className="font-semibold text-foreground text-sm mb-1">Fonctionnalités Pro</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Contrôlez le simulateur hypothécaire depuis l’admin.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium text-foreground">Activer le simulateur hypothécaire</p>
              <p className="text-xs text-muted-foreground">Visible sur les fiches contrats hypothécaires</p>
            </div>
            <Switch
              checked={features.mortgageSimulatorEnabled}
              onCheckedChange={(v) =>
                setFeatures((prev) => ({
                  ...prev,
                  mortgageSimulatorEnabled: Boolean(v),
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium text-foreground">Réserver aux abonnés Pro</p>
              <p className="text-xs text-muted-foreground">Si désactivé, tous les utilisateurs y accèdent</p>
            </div>
            <Switch
              checked={features.mortgageSimulatorProOnly}
              onCheckedChange={(v) =>
                setFeatures((prev) => ({
                  ...prev,
                  mortgageSimulatorProOnly: Boolean(v),
                }))
              }
              disabled={!features.mortgageSimulatorEnabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium text-foreground">Activer la lecture bail locatif</p>
              <p className="text-xs text-muted-foreground">Loyer/charges, reconduction, préavis et échéances</p>
            </div>
            <Switch
              checked={features.leaseInsightsEnabled}
              onCheckedChange={(v) =>
                setFeatures((prev) => ({
                  ...prev,
                  leaseInsightsEnabled: Boolean(v),
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium text-foreground">Activer suggestions globales d’économies</p>
              <p className="text-xs text-muted-foreground">Synthèse coûts ménage + recommandations IA</p>
            </div>
            <Switch
              checked={features.globalSavingsAssistantEnabled}
              onCheckedChange={(v) =>
                setFeatures((prev) => ({
                  ...prev,
                  globalSavingsAssistantEnabled: Boolean(v),
                }))
              }
            />
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="text-sm font-medium text-foreground mb-2">Seuils de recommandations économies</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Logement max (%)</p>
                <Input
                  type="number"
                  value={features.optimizerHousingRatioTarget}
                  onChange={(e) =>
                    setFeatures((prev) => ({
                      ...prev,
                      optimizerHousingRatioTarget: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Télécom max (CHF/mois)</p>
                <Input
                  type="number"
                  value={features.optimizerTelecomMonthlyTarget}
                  onChange={(e) =>
                    setFeatures((prev) => ({
                      ...prev,
                      optimizerTelecomMonthlyTarget: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Énergie max (CHF/mois)</p>
                <Input
                  type="number"
                  value={features.optimizerEnergyMonthlyTarget}
                  onChange={(e) =>
                    setFeatures((prev) => ({
                      ...prev,
                      optimizerEnergyMonthlyTarget: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
            <Button size="sm" className="rounded-xl text-xs" onClick={save} disabled={saving}>
              {saved ? "Enregistré" : saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

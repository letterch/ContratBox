"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  User, Bell, Shield, Users, CreditCard, Trash2, LogOut,
  Plus, Check, ChevronRight, Smartphone, Mail, Home,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { addHouseholdMember, getHouseholdData, removeHouseholdMember } from "@/app/actions/household"

type Tab = "profile" | "notifications" | "security" | "household" | "billing"

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profil", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "household", label: "Ménage", icon: Users },
  { id: "billing", label: "Abonnement", icon: CreditCard },
]

const notifSettings = [
  { id: "renewal_30", label: "Rappel 30 jours avant échéance", email: true, push: true },
  { id: "renewal_7", label: "Rappel 7 jours avant échéance", email: true, push: true },
  { id: "renewal_1", label: "Rappel la veille de l'échéance", email: false, push: true },
  { id: "new_contract", label: "Confirmation d'ajout de contrat", email: true, push: false },
  { id: "price_change", label: "Alerte hausse de prix détectée", email: true, push: true },
  { id: "newsletter", label: "Conseils et astuces mensuels", email: false, push: false },
]

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [notifications, setNotifications] = useState(notifSettings)
  const [saved, setSaved] = useState(false)
  const [householdName, setHouseholdName] = useState("Mon ménage")
  const [members, setMembers] = useState<Array<{
    id: string
    firstName: string
    lastName?: string | null
    role: string
    dateOfBirth?: string | Date | null
    notes?: string | null
    contractCount: number
  }>>([])
  const [newFirstName, setNewFirstName] = useState("")
  const [newLastName, setNewLastName] = useState("")
  const [newRole, setNewRole] = useState("adult")
  const [newDob, setNewDob] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [memberBusy, setMemberBusy] = useState(false)
  const [memberError, setMemberError] = useState("")

  useEffect(() => {
    getHouseholdData().then((res) => {
      if (res.household?.name) setHouseholdName(res.household.name)
      setMembers(res.members)
    })
  }, [])

  const toggleNotif = (id: string, type: "email" | "push") => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, [type]: !n[type as keyof typeof n] } : n)
    )
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">Paramètres</h1>
            <p className="text-xs text-muted-foreground">Gérez votre compte et vos préférences</p>
          </div>
          <Button
            onClick={handleSave}
            className={cn(
              "h-9 px-4 rounded-xl text-sm transition-all",
              saved
                ? "bg-[oklch(0.56_0.15_162)] text-white"
                : "bg-primary text-primary-foreground shadow-brand"
            )}
          >
            {saved ? <><Check className="w-3.5 h-3.5 mr-1.5" />Enregistré</> : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap flex-shrink-0 lg:flex-shrink lg:w-full",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-5">
          {activeTab === "profile" && (
            <>
              <SectionCard title="Informations personnelles" description="Vos données de compte ContratBox">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Prénom</Label>
                    <Input defaultValue="Marc" className="rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Nom de famille</Label>
                    <Input defaultValue="Dupont" className="rounded-xl h-10" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Adresse e-mail</Label>
                    <Input defaultValue="marc@dupont.ch" className="rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Téléphone</Label>
                    <Input defaultValue="+41 78 123 45 67" className="rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Langue</Label>
                    <Select defaultValue="fr">
                      <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Canton de résidence</Label>
                    <Select defaultValue="VD">
                      <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["VD", "GE", "VS", "FR", "NE", "BE", "ZH", "BS"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Zone de danger">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Se déconnecter</p>
                      <p className="text-xs text-muted-foreground">Fermer la session sur cet appareil</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                      <LogOut className="w-3.5 h-3.5" />
                      Déconnexion
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                    <div>
                      <p className="text-sm font-medium text-destructive">Supprimer le compte</p>
                      <p className="text-xs text-muted-foreground">Action irréversible — tous vos contrats seront supprimés</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "notifications" && (
            <SectionCard title="Préférences de notification" description="Choisissez comment et quand vous souhaitez être alerté">
              <div className="flex items-center justify-end gap-6 mb-4 pr-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  E-mail
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Smartphone className="w-3.5 h-3.5" />
                  Push
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <p className="text-sm text-foreground flex-1">{n.label}</p>
                    <div className="flex items-center gap-6">
                      <Switch checked={n.email} onCheckedChange={() => toggleNotif(n.id, "email")} />
                      <Switch checked={n.push} onCheckedChange={() => toggleNotif(n.id, "push")} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {activeTab === "security" && (
            <>
              <SectionCard title="Mot de passe" description="Modifiez votre mot de passe de connexion">
                <div className="flex flex-col gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Mot de passe actuel</Label>
                    <Input type="password" placeholder="••••••••••••" className="rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Nouveau mot de passe</Label>
                    <Input type="password" placeholder="••••••••••••" className="rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Confirmer le nouveau mot de passe</Label>
                    <Input type="password" placeholder="••••••••••••" className="rounded-xl h-10" />
                  </div>
                  <Button className="rounded-xl h-10 bg-primary text-primary-foreground shadow-brand w-fit">
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="Authentification à deux facteurs" description="Renforcez la sécurité de votre compte">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[oklch(0.56_0.15_162)]/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-[oklch(0.56_0.15_162)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Application d'authentification</p>
                      <p className="text-xs text-muted-foreground">Google Authenticator, Authy, etc.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">Configurer</Button>
                </div>
              </SectionCard>

              <SectionCard title="Sessions actives">
                <div className="flex flex-col gap-2">
                  {[
                    { device: "MacBook Pro — Lausanne", time: "Session actuelle", current: true },
                    { device: "iPhone 15 — Lausanne", time: "Il y a 2 heures", current: false },
                    { device: "iPad — Genève", time: "Hier à 18:43", current: false },
                  ].map((s) => (
                    <div key={s.device} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.device}</p>
                        <p className="text-xs text-muted-foreground">{s.time}</p>
                      </div>
                      {s.current
                        ? <Badge className="text-[10px] bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)] border-0">Actuelle</Badge>
                        : <Button variant="ghost" size="sm" className="text-xs text-muted-foreground rounded-xl hover:text-destructive">Révoquer</Button>
                      }
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "household" && (
            <>
              <SectionCard title={householdName} description="Gérez les membres de votre foyer">
                <div className="flex flex-col gap-2 mb-4">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">{`${m.firstName[0] ?? ""}${m.lastName?.[0] ?? ""}`.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{`${m.firstName} ${m.lastName ?? ""}`.trim()}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.contractCount} contrat{m.contractCount > 1 ? "s" : ""} assigné{m.contractCount > 1 ? "s" : ""}
                          {m.dateOfBirth ? ` · Né(e) le ${new Date(m.dateOfBirth).toLocaleDateString("fr-CH")}` : ""}
                        </p>
                        {m.notes && <p className="text-[11px] text-muted-foreground truncate">{m.notes}</p>}
                      </div>
                      <Badge className={cn(
                        "text-[10px] border-0 flex-shrink-0",
                        m.role === "adult"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {m.role === "adult" ? "Adulte" : m.role === "child" ? "Enfant" : m.role === "pet" ? "Animal" : "Membre"}
                      </Badge>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        disabled={memberBusy}
                        onClick={async () => {
                          try {
                            setMemberBusy(true)
                            setMemberError("")
                            await removeHouseholdMember(m.id)
                            const refreshed = await getHouseholdData()
                            setMembers(refreshed.members)
                          } catch (e) {
                            setMemberError(e instanceof Error ? e.message : "Suppression impossible")
                          } finally {
                            setMemberBusy(false)
                          }
                        }}
                      >
                          <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-2">
                  <Input placeholder="Prénom" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} />
                  <Input placeholder="Nom (optionnel)" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">Adulte</SelectItem>
                      <SelectItem value="child">Enfant</SelectItem>
                      <SelectItem value="pet">Animal</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-sm gap-2 w-full justify-center border-dashed h-10"
                    disabled={memberBusy}
                    onClick={async () => {
                      try {
                        setMemberBusy(true)
                        setMemberError("")
                        await addHouseholdMember({
                          firstName: newFirstName,
                          lastName: newLastName,
                          role: newRole,
                          dateOfBirth: newDob || null,
                          notes: newNotes || null,
                        })
                        setNewFirstName("")
                        setNewLastName("")
                        setNewRole("adult")
                        setNewDob("")
                        setNewNotes("")
                        const refreshed = await getHouseholdData()
                        setMembers(refreshed.members)
                      } catch (e) {
                        setMemberError(e instanceof Error ? e.message : "Ajout impossible")
                      } finally {
                        setMemberBusy(false)
                      }
                    }}
                  >
                  <Plus className="w-4 h-4" />
                  Ajouter un membre
                  </Button>
                </div>
                <Input
                  placeholder="Note (optionnelle, ex: Chien labrador)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="mb-2"
                />
                {memberError && <p className="text-xs text-destructive">{memberError}</p>}
              </SectionCard>

              <SectionCard title="Informations du ménage">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Nom du ménage</Label>
                    <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} className="rounded-xl h-10" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Adresse principale</Label>
                    <Input defaultValue="Route du Lac 12, 1009 Pully" className="rounded-xl h-10" />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "billing" && (
            <>
              <div className="bg-primary rounded-2xl p-6 text-primary-foreground shadow-brand">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-primary-foreground/60 mb-1">Plan actuel</p>
                    <p className="text-2xl font-bold">Premium</p>
                  </div>
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">Actif</Badge>
                </div>
                <div className="text-3xl font-bold mb-1">CHF 9.90<span className="text-lg font-normal text-primary-foreground/60">/mois</span></div>
                <p className="text-sm text-primary-foreground/60 mb-5">Prochain renouvellement le 1 avril 2026</p>
                <div className="grid grid-cols-2 gap-3">
                  {["Contrats illimités", "Ménage jusqu'à 6 membres", "Assistant IA inclus", "Alertes prioritaires"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-primary-foreground/80 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <SectionCard title="Moyen de paiement">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Visa •••• 4892</p>
                      <p className="text-xs text-muted-foreground">Expire 09/2027</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs">Modifier</Button>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-2 border-dashed w-full justify-center h-9">
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un moyen de paiement
                </Button>
              </SectionCard>

              <SectionCard title="Historique de facturation">
                <div className="flex flex-col gap-1">
                  {[
                    { date: "1 mars 2026", amount: "CHF 9.90", status: "Payé" },
                    { date: "1 février 2026", amount: "CHF 9.90", status: "Payé" },
                    { date: "1 janvier 2026", amount: "CHF 9.90", status: "Payé" },
                  ].map((inv) => (
                    <div key={inv.date} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.date}</p>
                        <p className="text-xs text-muted-foreground">Plan Premium</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">{inv.amount}</span>
                        <Badge className="text-[10px] bg-[oklch(0.56_0.15_162)]/10 text-[oklch(0.56_0.15_162)] border-0">{inv.status}</Badge>
                        <button className="text-xs text-muted-foreground hover:text-foreground">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

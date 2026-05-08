"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search } from "lucide-react"
import { toast } from "sonner"

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: string
  extraModules: string[]
  aiQuotaOverride: number | null
  contracts: number
  bills: number
  subscriptionStatus: string
  subscriptionPriceId: string | null
}

const MODULE_LABELS: Record<string, string> = {
  module_ai_chat: "Assistant IA",
  module_inbox: "Inbox admin",
  module_tasks: "Tâches",
  module_real_estate: "Immobilier",
  module_bills: "Factures",
  module_multi_household: "Multi-foyer",
  module_advanced_care: "Care / Pro",
}

export function AdminUserModulesClient({ moduleKeys }: { moduleKeys: string[] }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    fetchUsers("")
  }, [])

  async function fetchUsers(q: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/user-modules${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      const data = await res.json()
      if (res.ok) setUsers(data.users)
      else toast.error(data.error || "Erreur")
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  function patch(userId: string, payload: Partial<{ extraModules: string[]; aiQuotaOverride: number | null }>) {
    start(async () => {
      const res = await fetch("/api/admin/user-modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      })
      if (res.ok) {
        toast.success("Mis à jour")
        fetchUsers(search)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Erreur")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Utilisateurs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            fetchUsers(search)
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Rechercher par email ou nom"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            Rechercher
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-2 py-2">Utilisateur</th>
                <th className="px-2 py-2">Plan</th>
                <th className="px-2 py-2">Contrats / Factures</th>
                <th className="px-2 py-2">Modules supplémentaires</th>
                <th className="px-2 py-2">Quota IA / mois</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b align-top last:border-0">
                  <td className="px-2 py-3">
                    <div className="font-medium">{u.name || "(sans nom)"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.role === "admin" && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        admin
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-3 text-xs">
                    <Badge variant="outline">{u.subscriptionStatus}</Badge>
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">
                    {u.contracts} / {u.bills}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-1">
                      {moduleKeys.map((m) => {
                        const enabled = u.extraModules.includes(m)
                        return (
                          <label key={m} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={enabled}
                              disabled={pending}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? Array.from(new Set([...u.extraModules, m]))
                                  : u.extraModules.filter((x) => x !== m)
                                patch(u.id, { extraModules: next })
                              }}
                            />
                            {MODULE_LABELS[m] ?? m}
                          </label>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <AiQuotaEditor
                      userId={u.id}
                      current={u.aiQuotaOverride}
                      pending={pending}
                      onSave={(value) => patch(u.id, { aiQuotaOverride: value })}
                    />
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Aucun utilisateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function AiQuotaEditor({
  userId,
  current,
  pending,
  onSave,
}: {
  userId: string
  current: number | null
  pending: boolean
  onSave: (value: number | null) => void
}) {
  const [value, setValue] = useState<string>(current != null ? String(current) : "")
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-8 w-20 text-xs"
        placeholder="Plan"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!value.trim()) {
            onSave(null)
            return
          }
          const n = Number.parseInt(value, 10)
          if (!Number.isFinite(n) || n < 0) return
          onSave(n)
        }}
      >
        OK
      </Button>
      {current != null && <span className="text-[10px] text-muted-foreground">override</span>}
    </div>
  )
}

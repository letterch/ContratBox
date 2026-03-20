"use client"

import { useEffect, useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"

type Row = {
  id: string
  name: string | null
  email: string
  role: string
  isOwner: boolean
  isTenant: boolean
  createdAt: string | Date
  contracts: number
  isPro: boolean
  subscriptionStatus: string
}

export function ProUsersManager() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/pro-users")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data?.users) ? data.users : []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return rows
    return rows.filter((r) => (r.name ?? "").toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
  }, [rows, query])

  const patchUser = async (userId: string, patch: Partial<Pick<Row, "isPro" | "isOwner" | "isTenant">> & { isAdmin?: boolean }) => {
    setSavingUserId(userId)
    try {
      const res = await fetch("/api/admin/pro-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      })
      if (!res.ok) throw new Error("update")
      setRows((prev) =>
        prev.map((r) =>
          r.id === userId
            ? {
                ...r,
                isPro: patch.isPro ?? r.isPro,
                isOwner: patch.isOwner ?? r.isOwner,
                isTenant: patch.isTenant ?? r.isTenant,
                role: patch.isAdmin == null ? r.role : patch.isAdmin ? "admin" : "user",
                subscriptionStatus: patch.isPro == null ? r.subscriptionStatus : patch.isPro ? "active" : "free",
              }
            : r
        )
      )
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Gestion des accès Pro</h3>
          <p className="text-xs text-muted-foreground">Active/désactive l’accès Pro pour chaque utilisateur</p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="w-56 h-8 text-xs rounded-xl"
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Utilisateur</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Contrats</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Inscription</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Statut</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Admin</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Propriétaire</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Locataire</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <p className="text-sm text-foreground">{r.name ?? "Sans nom"}</p>
                    <p className="text-[11px] text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">{r.contracts}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-CH")}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.subscriptionStatus}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <Switch
                        checked={r.role === "admin"}
                        onCheckedChange={(v) => patchUser(r.id, { isAdmin: Boolean(v) })}
                        disabled={savingUserId === r.id}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <Switch
                        checked={r.isOwner}
                        onCheckedChange={(v) => patchUser(r.id, { isOwner: Boolean(v) })}
                        disabled={savingUserId === r.id}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <Switch
                        checked={r.isTenant}
                        onCheckedChange={(v) => patchUser(r.id, { isTenant: Boolean(v) })}
                        disabled={savingUserId === r.id}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <Switch
                        checked={r.isPro}
                        onCheckedChange={(v) => patchUser(r.id, { isPro: Boolean(v) })}
                        disabled={savingUserId === r.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

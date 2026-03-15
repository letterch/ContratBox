"use client"

import { useEffect, useMemo, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"

type Row = {
  id: string
  name: string | null
  email: string
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

  const togglePro = async (userId: string, isPro: boolean) => {
    setSavingUserId(userId)
    try {
      const res = await fetch("/api/admin/pro-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isPro }),
      })
      if (!res.ok) throw new Error("update")
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, isPro, subscriptionStatus: isPro ? "active" : "free" } : r)))
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
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Statut</th>
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
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.subscriptionStatus}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <Switch
                        checked={r.isPro}
                        onCheckedChange={(v) => togglePro(r.id, Boolean(v))}
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

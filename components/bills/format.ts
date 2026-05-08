export const chfFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 2,
})

export function formatChf(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return chfFormatter.format(value)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function isoDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

export function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default"
    case "overdue":
      return "destructive"
    case "disputed":
      return "outline"
    case "cancelled":
      return "secondary"
    case "pending":
    default:
      return "secondary"
  }
}

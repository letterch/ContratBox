/** Helpers d'affichage CHF — locale fr-CH, sans décimales pour les montants courants. */
export function formatChf(value: number, opts?: { decimals?: number; sign?: boolean }): string {
  const decimals = opts?.decimals ?? 0
  const formatted = value.toLocaleString("fr-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  if (opts?.sign && value > 0) return `+${formatted}`
  return formatted
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(decimals)} %`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function isoDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

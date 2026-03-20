type UnknownRecord = Record<string, unknown>

export function parseUnknownDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export function deriveMinimumCommitmentEndDate(
  startDate: Date | null,
  value: unknown,
  unit: unknown
): Date | null {
  const n = Number(value)
  if (!startDate || !Number.isFinite(n) || n <= 0) return null
  const d = new Date(startDate)
  const u = String(unit ?? "").toLowerCase()
  if (u.startsWith("year")) d.setFullYear(d.getFullYear() + Math.round(n))
  else d.setMonth(d.getMonth() + Math.round(n))
  return d
}

export function getKeyDateFromContractLike(input: {
  renewalDate?: Date | string | null
  maturityDate?: Date | string | null
  endDate?: Date | string | null
  startDate?: Date | string | null
  rawExtraction?: unknown
}): Date | null {
  const raw = (input.rawExtraction ?? {}) as UnknownRecord
  const startDate =
    parseUnknownDate(input.startDate) ??
    parseUnknownDate(raw.startDate) ??
    null
  const minimumCommitmentDate =
    parseUnknownDate(raw.minimumCommitmentEndDate) ??
    deriveMinimumCommitmentEndDate(
      startDate,
      raw.minimumCommitmentValue,
      raw.minimumCommitmentUnit
    )
  return (
    parseUnknownDate(input.renewalDate) ??
    parseUnknownDate(input.maturityDate) ??
    parseUnknownDate(input.endDate) ??
    parseUnknownDate(raw.renewalDate) ??
    parseUnknownDate(raw.maturityDate) ??
    parseUnknownDate(raw.endDate) ??
    parseUnknownDate(raw.leaseEndDate) ??
    minimumCommitmentDate ??
    null
  )
}

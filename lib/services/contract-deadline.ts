type NoticeUnit = "days" | "months" | "years" | null | undefined

export function calculateCancellationDeadline(
  renewalDate: Date | null | undefined,
  noticeDays: number | null | undefined,
  noticeValue?: number | null,
  noticeUnit?: NoticeUnit
): Date | null {
  if (!renewalDate) return null
  const base = new Date(renewalDate)

  if (noticeValue && noticeValue > 0 && noticeUnit && noticeUnit !== "days") {
    const d = new Date(base)
    if (noticeUnit === "months") d.setMonth(d.getMonth() - noticeValue)
    else if (noticeUnit === "years") d.setFullYear(d.getFullYear() - noticeValue)
    return d
  }

  if (!noticeDays || noticeDays <= 0) return null
  const d = new Date(base)
  d.setDate(d.getDate() - noticeDays)
  return d
}

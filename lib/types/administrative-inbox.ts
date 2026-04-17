export const INBOX_CLASSIFICATIONS = [
  "invoice",
  "reminder",
  "letter",
  "lease",
  "insurance",
  "tax",
  "bank",
  "health",
  "subscription",
  "other",
] as const
export type InboxClassification = (typeof INBOX_CLASSIFICATIONS)[number]

export const INBOX_URGENCIES = ["low", "medium", "high", "critical"] as const
export type InboxUrgency = (typeof INBOX_URGENCIES)[number]

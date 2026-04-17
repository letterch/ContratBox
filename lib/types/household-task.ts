export const HOUSEHOLD_TASK_STATUSES = ["todo", "in_progress", "waiting", "done", "archived"] as const
export type HouseholdTaskStatus = (typeof HOUSEHOLD_TASK_STATUSES)[number]

export const HOUSEHOLD_TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type HouseholdTaskPriority = (typeof HOUSEHOLD_TASK_PRIORITIES)[number]

export function isHouseholdTaskStatus(s: string): s is HouseholdTaskStatus {
  return (HOUSEHOLD_TASK_STATUSES as readonly string[]).includes(s)
}

export function isHouseholdTaskPriority(s: string): s is HouseholdTaskPriority {
  return (HOUSEHOLD_TASK_PRIORITIES as readonly string[]).includes(s)
}

// ContratBox — Constantes métier

/** Catégories de contrats proposées (slug → label FR) */
export const CONTRACT_CATEGORIES = {
  household_insurance: "Assurance ménage",
  personal_liability: "RC privée",
  car_insurance: "Assurance auto",
  health_basic: "Maladie de base",
  health_supplementary: "Maladie complémentaire",
  legal_protection: "Protection juridique",
  travel_insurance: "Assurance voyage",
  life_insurance: "Assurance vie",
  telecom_mobile: "Télécom mobile",
  telecom_internet: "Télécom internet",
  utilities_electricity: "Électricité",
  utilities_gas: "Gaz",
  rent_lease: "Loyer / bail",
  mortgage: "Hypothèque",
  leasing: "Leasing",
  subscriptions: "Abonnements",
  banking_recurring: "Banque (produits récurrents)",
  taxes_installments: "Impôts / acomptes",
  pension_3a: "Pilier 3a",
  other: "Autre",
} as const

export type ContractCategorySlug = keyof typeof CONTRACT_CATEGORIES

export const CONTRACT_CATEGORY_SLUGS = Object.keys(CONTRACT_CATEGORIES) as ContractCategorySlug[]

import { FREE_PLAN_CONTRACT_LIMIT, FREE_PLAN_BILL_LIMIT } from "@/lib/config/plans"

/** Limite gratuite : alignée sur `lib/config/plans.ts` (plan free). */
export const FREE_CONTRACT_LIMIT = FREE_PLAN_CONTRACT_LIMIT
export const FREE_BILL_LIMIT = FREE_PLAN_BILL_LIMIT

/** Rôles des membres du ménage */
export const MEMBER_ROLES = ["adult", "child", "other"] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

/** Catégories de factures mensuelles (slug → label FR) */
export const BILL_CATEGORIES = {
  rent: "Loyer",
  mortgage_payment: "Mensualité hypothécaire",
  utilities_electricity: "Électricité",
  utilities_gas: "Gaz",
  utilities_water: "Eau",
  utilities_heating: "Chauffage",
  telecom_internet: "Internet",
  telecom_mobile: "Téléphonie mobile",
  tv_streaming: "TV / streaming",
  insurance_premium: "Prime d'assurance",
  health_premium: "Prime maladie",
  taxes: "Impôts / acomptes",
  childcare: "Garde / crèche",
  education: "Scolarité / formation",
  transport: "Transports",
  fuel: "Carburant",
  groceries: "Courses récurrentes",
  subscription: "Abonnement",
  bank_fees: "Frais bancaires",
  pension_3a: "Pilier 3a",
  ppe_charges: "Charges PPE",
  other: "Autre",
} as const

export type BillCategorySlug = keyof typeof BILL_CATEGORIES
export const BILL_CATEGORY_SLUGS = Object.keys(BILL_CATEGORIES) as BillCategorySlug[]

/** Statuts d'une facture. */
export const BILL_STATUSES = ["pending", "paid", "overdue", "disputed", "cancelled"] as const
export type BillStatus = (typeof BILL_STATUSES)[number]

/** Récurrences supportées pour les factures. */
export const BILL_RECURRENCES = ["one_off", "monthly", "quarterly", "annual"] as const
export type BillRecurrence = (typeof BILL_RECURRENCES)[number]

export const BILL_RECURRENCE_LABELS: Record<BillRecurrence, string> = {
  one_off: "Ponctuelle",
  monthly: "Mensuelle",
  quarterly: "Trimestrielle",
  annual: "Annuelle",
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  pending: "En attente",
  paid: "Payée",
  overdue: "En retard",
  disputed: "Contestée",
  cancelled: "Annulée",
}

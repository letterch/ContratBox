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

/** Limite gratuite : nombre de contrats sans abonnement */
export const FREE_CONTRACT_LIMIT = 3

/** Rôles des membres du ménage */
export const MEMBER_ROLES = ["adult", "child", "other"] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

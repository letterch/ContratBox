/** Usage du bien pour traitements métier (loyers, rendements, décompte locatif). */
export type InvestmentKind = "rental" | "primary_residence"

export function parseInvestmentKind(value: unknown): InvestmentKind {
  return String(value ?? "").trim() === "primary_residence" ? "primary_residence" : "rental"
}

export function investmentKindLabel(kind: string): string {
  return parseInvestmentKind(kind) === "primary_residence" ? "Domicile principal" : "Bien de rendement"
}

export function isPrimaryResidence(kind: string): boolean {
  return parseInvestmentKind(kind) === "primary_residence"
}

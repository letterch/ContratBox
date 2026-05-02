import { describe, expect, it } from "vitest"
import { analyzeMortgageContractDecision } from "@/lib/services/mortgage-recommendation"

describe("analyzeMortgageContractDecision", () => {
  it("retourne null pour non-hypothèque", () => {
    expect(
      analyzeMortgageContractDecision({
        id: "x",
        category: "telecom_mobile",
        rawExtraction: {},
      })
    ).toBeNull()
  })

  it("produit une décision pour hypothèque avec capital et taux", () => {
    const d = analyzeMortgageContractDecision({
      id: "m1",
      category: "mortgage",
      maturityDate: new Date(Date.now() + 200 * 86400000),
      mortgageRate: 2.8,
      rawExtraction: { mortgagePrincipal: 400_000 },
    })
    expect(d).not.toBeNull()
    expect(d?.recommendation).toMatch(/renegotiate|keep/)
    expect(typeof d?.savingsPotential).toBe("number")
  })
})

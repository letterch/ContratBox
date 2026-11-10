import assert from "node:assert/strict"
import { matchMemberFromExtraction } from "@/lib/services/member-match"

const members = [
  { id: "1", firstName: "Maria", lastName: "Petronio" },
  { id: "2", firstName: "Kevin", lastName: null },
]

{
  const r = matchMemberFromExtraction({
    members,
    insuredPersonName: "Maria Petronio",
  })
  assert.equal(r.memberId, "1")
  assert.ok(r.confidence >= 0.7)
  assert.equal(r.isHouseholdWide, false)
}

{
  const r = matchMemberFromExtraction({
    members,
    extractedText: "Police assuré : Kevin\nPrime annuelle CHF 1200",
  })
  assert.equal(r.memberId, "2")
}

{
  const r = matchMemberFromExtraction({
    members: [],
    insuredPersonName: "X",
  })
  assert.equal(r.memberId, null)
  assert.equal(r.isHouseholdWide, true)
}

console.log("member-match.test.ts OK")

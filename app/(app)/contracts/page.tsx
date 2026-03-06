import { getContractsList } from "@/app/actions/dashboard"
import { ContractsListClient } from "@/components/contracts/contracts-list-client"

export default async function ContractsPage() {
  const { contracts, members, categories } = await getContractsList()
  return (
    <ContractsListClient
      contracts={contracts}
      members={members}
      categories={categories}
    />
  )
}

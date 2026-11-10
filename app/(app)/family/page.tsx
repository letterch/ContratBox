import { requireAccessContext } from "@/lib/guards/require-access"
import { getFamilyPageDataAction } from "@/app/actions/family"
import { FamilyPageClient } from "@/components/family/family-page-client"

export default async function FamilyPage() {
  await requireAccessContext()
  const data = await getFamilyPageDataAction()
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Famille</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Membres du ménage, enfants et animaux — pour attribuer contrats et dépenses.
          </p>
        </div>
        <FamilyPageClient
          householdName={data.household.name}
          members={data.members.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            role: m.role,
            dateOfBirth: m.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          }))}
          dependents={data.dependents.map((d) => ({
            id: d.id,
            type: d.type,
            name: d.name,
            species: d.species,
            birthDate: d.birthDate?.toISOString().slice(0, 10) ?? null,
          }))}
        />
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users, BarChart3 } from "lucide-react"

type Props = {
  defaultTab?: "properties" | "leases" | "summary"
  propertiesTab: React.ReactNode
  leasesTab: React.ReactNode
  summaryTab: React.ReactNode
  /** Compteur affiché à côté de l'onglet « Mes biens ». */
  propertyCount: number
  /** Compteur affiché à côté de l'onglet « Locations » (locataires renseignés). */
  leaseCount: number
}

export function PortfolioTabs({
  defaultTab = "properties",
  propertiesTab,
  leasesTab,
  summaryTab,
  propertyCount,
  leaseCount,
}: Props) {
  return (
    <Tabs defaultValue={defaultTab} className="gap-4">
      <TabsList className="h-10 p-1 w-full sm:w-fit">
        <TabsTrigger value="properties" className="gap-1.5 text-xs h-full px-3">
          <Building2 className="w-3.5 h-3.5" />
          Mes biens
          <span className="ml-1 rounded-full bg-muted-foreground/20 text-[10px] px-1.5 py-0.5">{propertyCount}</span>
        </TabsTrigger>
        <TabsTrigger value="leases" className="gap-1.5 text-xs h-full px-3">
          <Users className="w-3.5 h-3.5" />
          Locations
          <span className="ml-1 rounded-full bg-muted-foreground/20 text-[10px] px-1.5 py-0.5">{leaseCount}</span>
        </TabsTrigger>
        <TabsTrigger value="summary" className="gap-1.5 text-xs h-full px-3">
          <BarChart3 className="w-3.5 h-3.5" />
          Synthèse
        </TabsTrigger>
      </TabsList>
      <TabsContent value="properties" className="mt-1">
        {propertiesTab}
      </TabsContent>
      <TabsContent value="leases" className="mt-1">
        {leasesTab}
      </TabsContent>
      <TabsContent value="summary" className="mt-1">
        {summaryTab}
      </TabsContent>
    </Tabs>
  )
}

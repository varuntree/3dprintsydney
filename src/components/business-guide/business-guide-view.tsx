"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingSection } from "./sections/pricing-section";
import { ShippingSection } from "./sections/shipping-section";
import { DiscountsSection } from "./sections/discounts-section";
import { SlicingSection } from "./sections/slicing-section";
import { WorkflowsSection } from "./sections/workflows-section";
import { ChangelogSection } from "./sections/changelog-section";
import type { SettingsPayload } from "@/components/settings/settings-form";
import type { MaterialDTO } from "@/server/services/materials";

interface ExampleInvoice {
  id: number;
  number: string;
  subtotal: string | number;
  tax: string | number;
  shipping_cost: string | number;
  shipping_label: string | null;
  total: string | number;
  discount_type: string | null;
  discount_value: string | number | null;
  tax_rate: string | number;
  credit_applied: string | number;
  invoice_items: Array<{
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    unit_price: string | number;
    discount_type: string | null;
    discount_value: string | number | null;
    total: string | number;
  }>;
}

interface BusinessGuideViewProps {
  settings: SettingsPayload;
  materials: MaterialDTO[];
  exampleInvoices: ExampleInvoice[];
}

export function BusinessGuideView({
  settings,
  materials,
  exampleInvoices,
}: BusinessGuideViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Guide</h1>
        <p className="text-muted-foreground">
          Comprehensive documentation of pricing calculations, business logic, and operational workflows.
        </p>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation Sections</CardTitle>
          <CardDescription>
            Select a section to learn about specific calculations and business processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-1">
              <TabsTrigger value="pricing" className="text-xs sm:text-sm">
                Pricing
              </TabsTrigger>
              <TabsTrigger value="shipping" className="text-xs sm:text-sm">
                Shipping
              </TabsTrigger>
              <TabsTrigger value="discounts" className="text-xs sm:text-sm">
                Discounts & Tax
              </TabsTrigger>
              <TabsTrigger value="slicing" className="text-xs sm:text-sm">
                Slicing
              </TabsTrigger>
              <TabsTrigger value="workflows" className="text-xs sm:text-sm">
                Workflows
              </TabsTrigger>
              <TabsTrigger value="changelog" className="text-xs sm:text-sm">
                Changelog
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-6 mt-6">
              <PricingSection
                settings={settings}
                materials={materials}
                exampleInvoices={exampleInvoices}
              />
            </TabsContent>

            <TabsContent value="shipping" className="space-y-6 mt-6">
              <ShippingSection settings={settings} />
            </TabsContent>

            <TabsContent value="discounts" className="space-y-6 mt-6">
              <DiscountsSection
                settings={settings}
                exampleInvoices={exampleInvoices}
              />
            </TabsContent>

            <TabsContent value="slicing" className="space-y-6 mt-6">
              <SlicingSection />
            </TabsContent>

            <TabsContent value="workflows" className="space-y-6 mt-6">
              <WorkflowsSection />
            </TabsContent>

            <TabsContent value="changelog" className="space-y-6 mt-6">
              <ChangelogSection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { PricingCalculator } from "../calculators/pricing-calculator";
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

interface PricingSectionProps {
  settings: SettingsPayload;
  materials: MaterialDTO[];
  exampleInvoices: ExampleInvoice[];
}

export function PricingSection({
  settings,
  materials,
  exampleInvoices,
}: PricingSectionProps) {
  const calculatorConfig = settings.calculatorConfig || {
    hourlyRate: 45,
    setupFee: 20,
    minimumPrice: 35,
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Calculations Overview</CardTitle>
          <CardDescription>
            How we calculate prices for 3D printing orders across quotes, invoices, and quick orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Our pricing system uses a cost-plus model that accounts for material usage,
            print time, setup costs, and enforces minimum pricing. All calculations are
            transparent and based on configurable system settings.
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Key Principle:</strong> Every price is calculated from real metrics
              (material weight and print time) obtained from the slicer, plus business overhead.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Quick Order Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Order Pricing Formula</CardTitle>
          <CardDescription>
            How prices are calculated when clients upload 3D models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formula Explanation */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Step-by-Step Calculation</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Material Cost:</strong> Weight of filament
                  used (in grams) multiplied by the cost per gram of the selected material
                </li>
                <li>
                  <strong className="text-foreground">Time Cost:</strong> Estimated print time
                  (in hours) multiplied by the hourly rate
                </li>
                <li>
                  <strong className="text-foreground">Setup Fee:</strong> Fixed fee added to
                  cover machine setup and preparation
                </li>
                <li>
                  <strong className="text-foreground">Minimum Price Check:</strong> If the sum
                  is below the minimum price, use the minimum price instead
                </li>
                <li>
                  <strong className="text-foreground">Multiply by Quantity:</strong> The final
                  unit price is multiplied by the number of copies requested
                </li>
              </ol>
            </div>

            <Separator />

            {/* Mathematical Formula */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">MATHEMATICAL FORMULA</p>
              <div className="font-mono text-sm space-y-1">
                <p>Material Cost = Grams × Cost per Gram</p>
                <p>Time Cost = Hours × Hourly Rate</p>
                <p>Base Price = Material Cost + Time Cost + Setup Fee</p>
                <p>Unit Price = max(Minimum Price, Base Price)</p>
                <p className="font-bold">Total = Unit Price × Quantity</p>
              </div>
            </div>

            {/* Current Settings */}
            <div>
              <h4 className="font-semibold mb-3 text-sm">Current System Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Hourly Rate</p>
                  <p className="text-lg font-bold">{formatCurrency(calculatorConfig.hourlyRate)}/hour</p>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Setup Fee</p>
                  <p className="text-lg font-bold">{formatCurrency(calculatorConfig.setupFee)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Minimum Price</p>
                  <p className="text-lg font-bold">{formatCurrency(calculatorConfig.minimumPrice ?? 0)}</p>
                </div>
              </div>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Admin:</strong> Change these values in <strong>Settings → Calculator</strong> tab.
                  Adjusting hourly rate, setup fee, or minimum price affects all future Quick Order pricing.
                  Material costs are set in <strong>Dashboard → Materials</strong>.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Calculator */}
      <PricingCalculator
        materials={materials}
        hourlyRate={calculatorConfig.hourlyRate ?? 45}
        setupFee={calculatorConfig.setupFee ?? 20}
        minimumPrice={calculatorConfig.minimumPrice ?? 35}
      />

      {/* Line Item Calculations */}
      <Card>
        <CardHeader>
          <CardTitle>Line Item Total Calculation</CardTitle>
          <CardDescription>
            How individual line items are calculated on invoices and quotes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FORMULA</p>
            <div className="font-mono text-sm space-y-1">
              <p>Base = Quantity × Unit Price</p>
              <p>If Discount Type = PERCENT:</p>
              <p className="ml-4">Line Total = Base - (Base × Discount% / 100)</p>
              <p>If Discount Type = FIXED:</p>
              <p className="ml-4">Line Total = Base - Discount Amount</p>
              <p>If Discount Type = NONE:</p>
              <p className="ml-4">Line Total = Base</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Example with 10% Discount:</p>
            <div className="pl-4 space-y-1 text-muted-foreground">
              <p>• Quantity: 2 units</p>
              <p>• Unit Price: $50.00</p>
              <p>• Discount: 10% (PERCENT)</p>
              <Separator className="my-2" />
              <p>• Base = 2 × $50.00 = $100.00</p>
              <p>• Discount = $100.00 × 10% = $10.00</p>
              <p className="font-semibold text-foreground">• Line Total = $90.00</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Document Total Calculation</CardTitle>
          <CardDescription>
            How the final invoice or quote total is calculated from all line items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FORMULA</p>
            <div className="font-mono text-sm space-y-1">
              <p>Subtotal = Sum of all Line Totals</p>
              <p>Discounted = Apply document-level discount to Subtotal</p>
              <p>Taxable Base = Discounted + Shipping Cost</p>
              <p>Tax = Taxable Base × (Tax Rate / 100)</p>
              <p className="font-bold">Total = Taxable Base + Tax</p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Document-level discounts are applied to the subtotal
              before adding shipping. Tax is calculated on the discounted subtotal plus shipping.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Order of Operations:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-4">
              <li>Calculate each line item total (with line-level discounts)</li>
              <li>Sum all line totals to get subtotal</li>
              <li>Apply document-level discount (if any)</li>
              <li>Add shipping cost</li>
              <li>Calculate tax on (discounted subtotal + shipping)</li>
              <li>Add tax to get final total</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Real Example */}
      {exampleInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Real Example from Recent Invoice</CardTitle>
            <CardDescription>
              Actual calculation breakdown from {exampleInvoices[0].number}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const invoice = exampleInvoices[0];
              const subtotal = typeof invoice.subtotal === "string" ? parseFloat(invoice.subtotal) : invoice.subtotal;
              const tax = typeof invoice.tax === "string" ? parseFloat(invoice.tax) : invoice.tax;
              const shipping = typeof invoice.shipping_cost === "string" ? parseFloat(invoice.shipping_cost) : invoice.shipping_cost;
              const total = typeof invoice.total === "string" ? parseFloat(invoice.total) : invoice.total;
              const taxRate = typeof invoice.tax_rate === "string" ? parseFloat(invoice.tax_rate) : invoice.tax_rate;

              return (
                <>
                  {/* Line Items */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Line Items:</p>
                    {invoice.invoice_items.map((item, idx) => (
                      <div key={item.id} className="pl-4 text-sm text-muted-foreground">
                        <p>
                          {idx + 1}. {item.name} - Qty {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Calculation Steps */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal (all line items)</span>
                      <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>

                    {shipping > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Shipping {invoice.shipping_label && `(${invoice.shipping_label})`}
                        </span>
                        <span className="font-mono">{formatCurrency(shipping)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                      <span className="font-mono">{formatCurrency(tax)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="font-mono">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Edge Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Important Rules & Edge Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                All monetary values are rounded to 2 decimal places
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Negative totals are prevented (minimum value is $0.00)
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Minimum price is enforced per unit, not per order
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Material costs vary by material type and are pulled from the materials catalog
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                If slicing fails, fallback estimates are used (80g, 1 hour) and client must approve
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

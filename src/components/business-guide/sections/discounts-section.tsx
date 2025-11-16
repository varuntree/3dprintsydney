"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Percent } from "lucide-react";
import { DiscountCalculator } from "../calculators/discount-calculator";
import type { SettingsPayload } from "@/components/settings/settings-form";
import { STUDENT_DISCOUNT_RATE } from "@/lib/student-discount";

interface ExampleInvoice {
  id: number;
  number: string;
  subtotal: string | number;
  tax: string | number;
  shipping_cost: string | number;
  total: string | number;
  discount_type: string | null;
  discount_value: string | number | null;
  tax_rate: string | number;
  invoice_items: Array<{
    id: number;
    name: string;
    quantity: number;
    unit_price: string | number;
    discount_type: string | null;
    discount_value: string | number | null;
    total: string | number;
  }>;
}

interface DiscountsSectionProps {
  settings: SettingsPayload;
  exampleInvoices: ExampleInvoice[];
}

export function DiscountsSection({
  settings,
}: DiscountsSectionProps) {
  const taxRate = settings.taxRate || 10;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Discounts & Tax Calculations</CardTitle>
          </div>
          <CardDescription>
            How discounts are applied at line and document level, plus tax calculation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Our system supports flexible discounting at two levels: individual line items and
            entire documents. Discounts can be applied as a percentage or a fixed dollar amount.
            Tax is calculated after all discounts and added to the final total.
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Key Principle:</strong> Line-level discounts are applied first to calculate
              each line total. Document-level discounts are then applied to the subtotal. Finally,
              tax is calculated on the discounted subtotal plus shipping.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Discount Types */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Types</CardTitle>
          <CardDescription>
            Three types of discounts available in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <Badge className="mb-2">NONE</Badge>
                <p className="text-sm font-semibold">No Discount</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Default option. Full price charged with no reduction.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border">
                <Badge className="mb-2">PERCENT</Badge>
                <p className="text-sm font-semibold">Percentage Discount</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reduces the price by a percentage. Example: 10% off reduces $100 to $90.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border">
                <Badge className="mb-2">FIXED</Badge>
                <p className="text-sm font-semibold">Fixed Amount Discount</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reduces the price by a fixed dollar amount. Example: $15 off reduces $100 to $85.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line-Level Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Line-Level Discounts</CardTitle>
          <CardDescription>
            Applied to individual line items before calculating subtotal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FORMULAS</p>
            <div className="font-mono text-sm space-y-1">
              <p>Base = Quantity × Unit Price</p>
              <p></p>
              <p>If PERCENT:</p>
              <p className="ml-4">Discount Amount = Base × (Discount% / 100)</p>
              <p className="ml-4">Line Total = Base - Discount Amount</p>
              <p></p>
              <p>If FIXED:</p>
              <p className="ml-4">Line Total = max(0, Base - Discount Amount)</p>
              <p></p>
              <p>If NONE:</p>
              <p className="ml-4">Line Total = Base</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-2">Example: 20% Line Discount</p>
              <div className="space-y-1 text-muted-foreground">
                <p>• Quantity: 3 units</p>
                <p>• Unit Price: $45.00</p>
                <p>• Discount: 20% (PERCENT)</p>
                <Separator className="my-2" />
                <p>• Base = 3 × $45.00 = $135.00</p>
                <p>• Discount = $135.00 × 20% = $27.00</p>
                <p className="font-semibold text-foreground">• Line Total = $108.00</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-2">Example: $25 Fixed Discount</p>
              <div className="space-y-1 text-muted-foreground">
                <p>• Quantity: 2 units</p>
                <p>• Unit Price: $60.00</p>
                <p>• Discount: $25.00 (FIXED)</p>
                <Separator className="my-2" />
                <p>• Base = 2 × $60.00 = $120.00</p>
                <p>• Discount = $25.00</p>
                <p className="font-semibold text-foreground">• Line Total = $95.00</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document-Level Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Document-Level Discounts</CardTitle>
          <CardDescription>
            Applied to the subtotal before adding shipping and tax
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FORMULAS</p>
            <div className="font-mono text-sm space-y-1">
              <p>Subtotal = Sum of all Line Totals</p>
              <p></p>
              <p>If PERCENT:</p>
              <p className="ml-4">Discount Amount = Subtotal × (Discount% / 100)</p>
              <p className="ml-4">Discounted Subtotal = Subtotal - Discount Amount</p>
              <p></p>
              <p>If FIXED:</p>
              <p className="ml-4">Discounted Subtotal = max(0, Subtotal - Discount Amount)</p>
              <p></p>
              <p>If NONE:</p>
              <p className="ml-4">Discounted Subtotal = Subtotal</p>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Document-level discounts do not apply to shipping
              costs. Shipping is added after the discount is applied.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tax Calculation */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Calculation</CardTitle>
          <CardDescription>
            GST (Goods and Services Tax) applied to the final amount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3 text-sm">Current Tax Rate</h4>
            <div className="bg-white p-4 rounded-lg border inline-block">
              <p className="text-xs text-muted-foreground">GST Rate</p>
              <p className="text-2xl font-bold">{taxRate}%</p>
            </div>
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Admin:</strong> Change the default tax rate in <strong>Settings → Tax & Numbering</strong> tab.
                This affects all new invoices and quotes. Discounts are manually set per line item or document when
                creating/editing invoices and quotes.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">FORMULA</p>
            <div className="font-mono text-sm space-y-1">
              <p>Taxable Base = Discounted Subtotal + Shipping Cost</p>
              <p>Tax = Taxable Base × (Tax Rate / 100)</p>
              <p className="font-bold">Total = Taxable Base + Tax</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Complete Example:</p>
            <div className="p-3 bg-white rounded-lg border space-y-1 text-muted-foreground">
              <p>• Subtotal (after line discounts): $200.00</p>
              <p>• Document discount (10%): -$20.00</p>
              <p>• Discounted Subtotal: $180.00</p>
              <p>• Shipping: $12.50</p>
              <Separator className="my-2" />
              <p>• Taxable Base: $192.50</p>
              <p>• Tax ({taxRate}%): $192.50 × 10% = $19.25</p>
              <p className="font-semibold text-foreground">• Total: $211.75</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Calculator */}
      <DiscountCalculator taxRate={taxRate} />

      {/* Student Discount */}
      <Card>
        <CardHeader>
          <CardTitle>Student Discount Program</CardTitle>
          <CardDescription>
            Automatic discount for verified student email addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs text-muted-foreground">Student Discount Rate</p>
              <p className="text-2xl font-bold text-blue-600">{STUDENT_DISCOUNT_RATE}%</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2 text-sm">How It Works</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                System checks the client&apos;s email address when creating quotes/invoices
              </li>
              <li>
                If email domain contains &quot;.edu&quot; (case-insensitive), client is marked as eligible
              </li>
              <li>
                A {STUDENT_DISCOUNT_RATE}% percentage discount is automatically applied at the
                document level
              </li>
              <li>
                The discount shows on the quote/invoice as &quot;Student Discount&quot;
              </li>
            </ol>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">ELIGIBILITY LOGIC</p>
            <div className="font-mono text-xs space-y-1">
              <p>email = client.email</p>
              <p>domain = email.split(&apos;@&apos;)[1]</p>
              <p>eligible = domain.includes(&apos;.edu&apos;)</p>
              <p>IF eligible:</p>
              <p className="ml-4">discount = {STUDENT_DISCOUNT_RATE}% (PERCENT)</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Examples:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="shrink-0">✓ Eligible</Badge>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  student@university.edu.au
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="shrink-0">✓ Eligible</Badge>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  john.doe@mit.edu
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">✗ Not Eligible</Badge>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  client@gmail.com
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">✗ Not Eligible</Badge>
                <code className="text-xs bg-white px-2 py-1 rounded border">
                  business@company.com
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Important Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Line-level discounts are calculated before document-level discounts
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Both discount types prevent negative totals (minimum $0.00)
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Shipping is NOT discounted - added after all discounts
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Tax is calculated on (discounted subtotal + shipping)
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Student discount can stack with other document-level discounts
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                All monetary values rounded to 2 decimal places
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

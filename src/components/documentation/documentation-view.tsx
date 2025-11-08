"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SettingsPayload } from "@/components/settings/settings-form";
import type { Material } from "@/server/services/materials";
import {
  Calculator,
  Truck,
  FileText,
  Receipt,
  GraduationCap,
  Wallet,
  Settings,
  Package,
} from "lucide-react";

type DocumentationViewProps = {
  settings: SettingsPayload;
  materials: Material[];
};

export function DocumentationView({ settings, materials }: DocumentationViewProps) {
  const config = settings.calculatorConfig;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
            <p className="text-sm text-muted-foreground">
              Pricing calculations and system algorithms
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* Product Pricing */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Calculator className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold">Product Pricing</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    How Pricing Works
                  </p>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-4 font-mono text-xs">
                    <div>Material Cost = (Model Grams × $/g) + (Support Grams × Support $/g)</div>
                    <div>Time Cost = (Seconds ÷ 3600) × Hourly Rate</div>
                    <div>Base Price = Material + Time + Setup Fee</div>
                    <div>Unit Price = max(Minimum Price, Base)</div>
                    <div>Total = Unit Price × Quantity</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Current Configuration
                  </p>
                  <div className="grid gap-2 rounded-lg bg-muted/50 p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hourly Rate:</span>
                      <span className="font-medium">${config.hourlyRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Fee:</span>
                      <span className="font-medium">${config.setupFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum Price:</span>
                      <span className="font-medium">${config.minimumPrice}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Process Flow
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>Slice models → get grams, support grams, time</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>Calculate material cost (separate for support if different material)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Add time cost (hours × rate)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>Add setup fee</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">5.</span>
                      <span>Enforce minimum price</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">6.</span>
                      <span>Multiply by quantity</span>
                    </li>
                  </ol>
                </div>
              </div>
            </Card>
          </section>

          {/* Delivery Pricing */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Truck className="h-4 w-4 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Delivery Pricing</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    How Delivery Is Calculated
                  </p>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-4 font-mono text-xs">
                    <div>Amount = Base Amount + Remote Surcharge (if postcode matches)</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    How It Works
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>Match state from address</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>Match postcode prefix within state</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Apply remote surcharge if postcode in postcodePrefixes</span>
                    </li>
                  </ol>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Shipping Regions
                  </p>
                  <div className="space-y-2 text-sm">
                    {settings.shippingRegions?.map((region) => (
                      <div
                        key={region.code}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3"
                      >
                        <div>
                          <p className="font-medium">{region.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {region.states.join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${region.baseAmount}</p>
                          {region.remoteSurcharge ? (
                            <p className="text-xs text-muted-foreground">
                              +${region.remoteSurcharge} remote
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Document Totals */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Receipt className="h-4 w-4 text-purple-500" />
              </div>
              <h2 className="text-xl font-semibold">Invoice & Quote Totals</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Calculation Formula
                  </p>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-4 font-mono text-xs">
                    <div>Subtotal = Sum(line totals)</div>
                    <div>Apply Discount (%, fixed, or none) → Discounted Subtotal</div>
                    <div>Taxable Base = Discounted Subtotal + Shipping</div>
                    <div>Tax = Taxable Base × (Tax Rate ÷ 100)</div>
                    <div>Total = Taxable Base + Tax</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Order of Operations
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>Sum all line items</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>Apply document-level discount</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Add shipping cost</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>Calculate tax on (discounted subtotal + shipping)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">5.</span>
                      <span>Add tax to get final total</span>
                    </li>
                  </ol>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Current Tax Rate
                  </p>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax Rate:</span>
                      <span className="font-semibold">{settings.taxRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Line Item Calculations */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                <Package className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="text-xl font-semibold">Line Item Discounts</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Calculation Formula
                  </p>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-4 font-mono text-xs">
                    <div>Base = Quantity × Unit Price</div>
                    <div className="mt-2">PERCENT: Base - (Base × % ÷ 100)</div>
                    <div>FIXED: Base - Amount</div>
                    <div>NONE: Base</div>
                    <div className="mt-2">Result = max(0, value)</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Discount Types
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <p className="font-medium">NONE</p>
                      <p className="text-xs text-muted-foreground">No discount applied</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <p className="font-medium">PERCENT</p>
                      <p className="text-xs text-muted-foreground">
                        Percentage off (e.g., 10%)
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <p className="font-medium">FIXED</p>
                      <p className="text-xs text-muted-foreground">
                        Fixed amount off (e.g., $5)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Student Discount */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10">
                <GraduationCap className="h-4 w-4 text-pink-500" />
              </div>
              <h2 className="text-xl font-semibold">Student Discount</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    How It Works
                  </p>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-4 font-mono text-xs">
                    <div>If email contains &quot;.edu&quot;: 20% discount</div>
                    <div>Else: 0%</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Auto-Applied In
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Quick orders</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Quotes (create & update)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Invoices (create & update)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          {/* Wallet Credit */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                <Wallet className="h-4 w-4 text-cyan-500" />
              </div>
              <h2 className="text-xl font-semibold">Wallet Credit</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Calculation Formula
                  </p>
                  <div className="space-y-1 rounded-lg bg-muted/50 p-4 font-mono text-xs">
                    <div>Credit Applied = min(Balance Due, Wallet Balance, Requested)</div>
                    <div>New Balance = Total - Credit Applied</div>
                    <div>If Balance ≤ 0: Status = PAID</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Process Flow
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>Check invoice not already paid</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>Get wallet balance</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Calculate max available: min(balance due, wallet balance)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">4.</span>
                      <span>If requested amount specified, use min(max available, requested)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">5.</span>
                      <span>Deduct from wallet</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">6.</span>
                      <span>Update invoice credit_applied and balance_due</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-primary">7.</span>
                      <span>Mark as PAID if balance ≤ 0</span>
                    </li>
                  </ol>
                </div>
              </div>
            </Card>
          </section>

          {/* Material Costs */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10">
                <Settings className="h-4 w-4 text-yellow-500" />
              </div>
              <h2 className="text-xl font-semibold">Material Costs</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Current Materials
                  </p>
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.color} • {material.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${material.costPerGram.toFixed(3)}/g
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Fallback Cost
                  </p>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        If material not found:
                      </span>
                      <span className="font-semibold">$0.05/g</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Rounding Rules */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <Calculator className="h-4 w-4 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold">Important Rules</h2>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Currency Rounding
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All prices rounded to 2 decimal places
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Special Cases
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Minimum Price:</strong> Enforced per item, not per order
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Fallback Estimates:</strong> If file analysis fails: 80g, 1 hour estimated
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>No Matching Region:</strong> If shipping region unknown: $0
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong>Support Material:</strong> Can have different cost if specified, otherwise uses model material cost
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { calculateLineTotal, calculateDocumentTotals } from "@/lib/calculations";
import type { DiscountType } from "@/lib/calculations";

interface DiscountCalculatorProps {
  taxRate: number;
}

export function DiscountCalculator({ taxRate }: DiscountCalculatorProps) {
  // Line item inputs
  const [quantity, setQuantity] = useState(2);
  const [unitPrice, setUnitPrice] = useState(50);
  const [lineDiscountType, setLineDiscountType] = useState<DiscountType>("NONE");
  const [lineDiscountValue, setLineDiscountValue] = useState(10);

  // Document level inputs
  const [docDiscountType, setDocDiscountType] = useState<DiscountType>("NONE");
  const [docDiscountValue, setDocDiscountValue] = useState(15);
  const [shippingCost, setShippingCost] = useState(12.50);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  // Calculate line total
  const lineTotal = calculateLineTotal({
    quantity,
    unitPrice,
    discountType: lineDiscountType,
    discountValue: lineDiscountValue,
  });

  // Calculate document totals
  const docTotals = calculateDocumentTotals({
    lines: [{ total: lineTotal }],
    discountType: docDiscountType,
    discountValue: docDiscountValue,
    shippingCost,
    taxRate,
  });

  const lineBase = quantity * unitPrice;
  const lineDiscount = lineBase - lineTotal;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg">Interactive Discount & Tax Calculator</CardTitle>
        <CardDescription>
          See how discounts at line and document level affect the final total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Line Item Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Line Item</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price ($)</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineDiscountType">Line Discount Type</Label>
              <Select
                value={lineDiscountType}
                onValueChange={(val) => setLineDiscountType(val as DiscountType)}
              >
                <SelectTrigger id="lineDiscountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lineDiscountType !== "NONE" && (
              <div className="space-y-2">
                <Label htmlFor="lineDiscountValue">
                  {lineDiscountType === "PERCENT" ? "Discount %" : "Discount Amount ($)"}
                </Label>
                <Input
                  id="lineDiscountValue"
                  type="number"
                  min="0"
                  step={lineDiscountType === "PERCENT" ? "1" : "0.01"}
                  value={lineDiscountValue}
                  onChange={(e) => setLineDiscountValue(Number(e.target.value) || 0)}
                />
              </div>
            )}
          </div>

          {/* Line Calculation */}
          <div className="bg-slate-50 p-3 rounded-lg border space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base</span>
              <span className="font-mono">{quantity} × {formatCurrency(unitPrice)} = {formatCurrency(lineBase)}</span>
            </div>
            {lineDiscountType !== "NONE" && (
              <div className="flex justify-between text-orange-600">
                <span>Line Discount</span>
                <span className="font-mono">-{formatCurrency(lineDiscount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Line Total</span>
              <span className="font-mono">{formatCurrency(lineTotal)}</span>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Document Level Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Document Level</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="docDiscountType">Document Discount Type</Label>
              <Select
                value={docDiscountType}
                onValueChange={(val) => setDocDiscountType(val as DiscountType)}
              >
                <SelectTrigger id="docDiscountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {docDiscountType !== "NONE" && (
              <div className="space-y-2">
                <Label htmlFor="docDiscountValue">
                  {docDiscountType === "PERCENT" ? "Discount %" : "Discount Amount ($)"}
                </Label>
                <Input
                  id="docDiscountValue"
                  type="number"
                  min="0"
                  step={docDiscountType === "PERCENT" ? "1" : "0.01"}
                  value={docDiscountValue}
                  onChange={(e) => setDocDiscountValue(Number(e.target.value) || 0)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping Cost ($)</Label>
              <Input
                id="shipping"
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={taxRate}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-muted-foreground">From system settings</p>
            </div>
          </div>

          {/* Document Calculation */}
          <div className="bg-slate-50 p-4 rounded-lg border space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal (Line Totals)</span>
              <span className="font-mono">{formatCurrency(docTotals.subtotal)}</span>
            </div>

            {docDiscountType !== "NONE" && (
              <div className="flex justify-between text-orange-600">
                <span>Document Discount</span>
                <span className="font-mono">-{formatCurrency(docTotals.subtotal - docTotals.discounted)}</span>
              </div>
            )}

            {docDiscountType !== "NONE" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discounted Subtotal</span>
                <span className="font-mono">{formatCurrency(docTotals.discounted)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-mono">{formatCurrency(shippingCost)}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({taxRate}% on {formatCurrency(docTotals.discounted + shippingCost)})
              </span>
              <span className="font-mono">{formatCurrency(docTotals.tax)}</span>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Final Total</span>
              <span className="font-mono">{formatCurrency(docTotals.total)}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">ORDER OF OPERATIONS</p>
          <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
            <li>Calculate line total with line-level discount</li>
            <li>Sum all line totals to get subtotal</li>
            <li>Apply document-level discount to subtotal</li>
            <li>Add shipping to discounted subtotal</li>
            <li>Calculate tax on (discounted subtotal + shipping)</li>
            <li>Add tax to get final total</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

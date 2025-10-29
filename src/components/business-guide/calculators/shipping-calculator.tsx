"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SettingsInput } from "@/lib/schemas/settings";

type ShippingRegion = SettingsInput["shippingRegions"][number];

interface ShippingCalculatorProps {
  shippingRegions: ShippingRegion[];
  defaultRegionCode: string;
}

export function ShippingCalculator({
  shippingRegions,
  defaultRegionCode,
}: ShippingCalculatorProps) {
  const [state, setState] = useState("NSW");
  const [postcode, setPostcode] = useState("");

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  // Replicate the resolveShippingRegion logic
  const calculateShipping = () => {
    const fallback =
      shippingRegions.find((r) => r.code === defaultRegionCode) || shippingRegions[0];

    if (!fallback) {
      return {
        code: "none",
        label: "Shipping",
        baseAmount: 0,
        amount: 0,
        remoteSurcharge: 0,
        remoteApplied: false,
      };
    }

    const targetState = state.trim().toUpperCase();
    const targetPostcode = postcode.trim();

    // Find regions matching the state
    let candidates = shippingRegions.filter((region) =>
      region.states?.some((s: string) => s.trim().toUpperCase() === targetState)
    );

    // If no state match, use fallback
    if (candidates.length === 0) {
      return {
        code: fallback.code,
        label: fallback.label,
        baseAmount: fallback.baseAmount ?? 0,
        amount: fallback.baseAmount ?? 0,
        remoteSurcharge: 0,
        remoteApplied: false,
      };
    }

    // If postcode provided, try to match by postcode prefix
    if (targetPostcode) {
      const postcodeMatch = candidates.find((region) =>
        (region.postcodePrefixes ?? []).some((prefix: string) =>
          targetPostcode.startsWith(prefix)
        )
      );
      if (postcodeMatch) {
        candidates = [postcodeMatch];
      }
    }

    const selected = candidates[0] ?? fallback;
    const baseAmount = Number(selected.baseAmount ?? 0);

    // Check if remote surcharge applies
    const remoteSurcharge =
      targetPostcode &&
      (selected.postcodePrefixes ?? []).some((prefix: string) =>
        targetPostcode.startsWith(prefix)
      )
        ? Number(selected.remoteSurcharge ?? 0)
        : 0;

    const amount = Math.round((baseAmount + remoteSurcharge) * 100) / 100;

    return {
      code: selected.code,
      label: selected.label,
      baseAmount,
      amount,
      remoteSurcharge,
      remoteApplied: remoteSurcharge > 0,
    };
  };

  const result = calculateShipping();

  const australianStates = ["NSW", "VIC", "QLD", "SA", "WA", "NT", "TAS", "ACT"];

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg">Interactive Shipping Calculator</CardTitle>
        <CardDescription>
          Enter delivery location to see shipping cost calculation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State / Territory</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {australianStates.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode (Optional)</Label>
            <Input
              id="postcode"
              type="text"
              placeholder="e.g., 2000"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              maxLength={4}
            />
          </div>
        </div>

        <Separator />

        {/* Calculation Result */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Shipping Quote</h4>

          <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Region</span>
              <Badge variant="secondary">{result.label}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Region Code</span>
              <span className="font-mono text-sm">{result.code}</span>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Shipping</span>
                <span className="font-mono">{formatCurrency(result.baseAmount)}</span>
              </div>

              {result.remoteApplied && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Remote Area Surcharge
                    <Badge variant="outline" className="ml-2 text-xs">
                      Postcode {postcode}
                    </Badge>
                  </span>
                  <span className="font-mono text-orange-600">
                    +{formatCurrency(result.remoteSurcharge)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total Shipping Cost</span>
                <span className="font-mono">
                  {formatCurrency(result.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formula Display */}
        <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">CALCULATION LOGIC</p>
          <div className="text-xs space-y-1 text-muted-foreground">
            <p>1. Match state to shipping region(s)</p>
            <p>2. If postcode provided, refine match using postcode prefixes</p>
            <p>3. Check if postcode qualifies for remote area surcharge</p>
            <p>4. Shipping Cost = Base Amount + Remote Surcharge (if applicable)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

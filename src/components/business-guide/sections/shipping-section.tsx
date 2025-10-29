"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, MapPin } from "lucide-react";
import { ShippingCalculator } from "../calculators/shipping-calculator";
import type { SettingsPayload } from "@/components/settings/settings-form";

interface ShippingSectionProps {
  settings: SettingsPayload;
}

export function ShippingSection({ settings }: ShippingSectionProps) {
  const shippingRegions = settings.shippingRegions || [];
  const defaultRegion = settings.defaultShippingRegion || "";

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Shipping & Delivery Calculations</CardTitle>
          </div>
          <CardDescription>
            How shipping costs are determined based on location and delivery zones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Our shipping system uses region-based pricing with support for state matching,
            postcode-level granularity, and remote area surcharges. This ensures fair and
            transparent shipping costs for all customers across Australia.
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Key Principle:</strong> Shipping is calculated at checkout based on the
              delivery address. The system automatically selects the most specific matching
              region and applies any applicable surcharges.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Calculation Logic */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Calculation Logic</CardTitle>
          <CardDescription>
            Step-by-step process for determining shipping costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-sm">How It Works</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">State Matching:</strong> The system
                  identifies all shipping regions that service the customer&apos;s state/territory
                </li>
                <li>
                  <strong className="text-foreground">Postcode Refinement:</strong> If a
                  postcode is provided, the system looks for regions with matching postcode
                  prefixes for more granular pricing
                </li>
                <li>
                  <strong className="text-foreground">Region Selection:</strong> The most
                  specific matching region is selected (postcode match preferred over state-only match)
                </li>
                <li>
                  <strong className="text-foreground">Remote Area Check:</strong> If the
                  postcode matches a remote area prefix defined in the selected region, a
                  surcharge is added
                </li>
                <li>
                  <strong className="text-foreground">Fallback:</strong> If no region matches
                  the location, the default shipping region is used
                </li>
              </ol>
            </div>

            <Separator />

            {/* Algorithm */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">ALGORITHM</p>
              <div className="font-mono text-xs space-y-1">
                <p>1. candidateRegions = regions.filter(r =&gt; r.states.includes(state))</p>
                <p>2. IF postcode provided:</p>
                <p className="ml-4">   refinedRegion = candidateRegions.find(r =&gt; postcode starts with r.postcodePrefixes)</p>
                <p className="ml-4">   IF refinedRegion: use refinedRegion</p>
                <p>3. selectedRegion = candidateRegions[0] OR defaultRegion</p>
                <p>4. baseAmount = selectedRegion.baseAmount</p>
                <p>5. remoteSurcharge = 0</p>
                <p>6. IF postcode matches selectedRegion.postcodePrefixes:</p>
                <p className="ml-4">   remoteSurcharge = selectedRegion.remoteSurcharge</p>
                <p className="font-bold">7. shippingCost = baseAmount + remoteSurcharge</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Calculator */}
      <ShippingCalculator
        shippingRegions={shippingRegions}
        defaultRegionCode={defaultRegion}
      />

      {/* Current Shipping Regions */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Shipping Regions</CardTitle>
          <CardDescription>
            Current shipping zones and their pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin:</strong> Manage shipping regions in <strong>Settings → Shipping</strong> tab.
              You can add/edit/delete regions, adjust base amounts, set remote surcharges, and configure
              postcode prefixes. Changes affect all future orders immediately.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardHeader>
          <CardTitle className="text-base">Active Regions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shippingRegions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shipping regions configured. Add regions in Settings to enable shipping
              calculations.
            </p>
          ) : (
            <div className="space-y-4">
              {shippingRegions.map((region, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{region.label}</h4>
                        {region.code === defaultRegion && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Code: {region.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ${(region.baseAmount ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Base Rate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">States/Territories</p>
                      <div className="flex flex-wrap gap-1">
                        {(region.states ?? []).map((state, sIdx) => (
                          <Badge key={sIdx} variant="outline">
                            {state}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {(region.postcodePrefixes ?? []).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Postcode Prefixes {region.remoteSurcharge && region.remoteSurcharge > 0 && "(Remote Areas)"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(region.postcodePrefixes ?? []).map((prefix, pIdx) => (
                            <Badge key={pIdx} variant="secondary">
                              {prefix}*
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {region.remoteSurcharge && region.remoteSurcharge > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Remote Area Surcharge
                        </span>
                        <span className="font-semibold text-orange-600">
                          +${region.remoteSurcharge.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Example Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-semibold mb-2">Scenario 1: Sydney Metro Delivery</p>
              <div className="space-y-1 text-muted-foreground">
                <p>• Location: NSW, Postcode 2000</p>
                <p>• Matches: Sydney Metro region (NSW state match)</p>
                <p>• No remote surcharge applicable</p>
                <p className="font-semibold text-foreground">
                  Result: Base shipping rate for Sydney Metro region
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-semibold mb-2">Scenario 2: Regional with Remote Surcharge</p>
              <div className="space-y-1 text-muted-foreground">
                <p>• Location: TAS, Postcode 7000</p>
                <p>• Matches: Tasmania region</p>
                <p>• Postcode 7000 matches remote prefix &quot;7&quot;</p>
                <p className="font-semibold text-foreground">
                  Result: Base rate + Remote surcharge
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-semibold mb-2">Scenario 3: State Only (No Postcode)</p>
              <div className="space-y-1 text-muted-foreground">
                <p>• Location: VIC (no postcode provided)</p>
                <p>• Matches: First region that includes VIC</p>
                <p>• No postcode refinement or surcharge check</p>
                <p className="font-semibold text-foreground">
                  Result: Base shipping rate for matched region
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Important Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Shipping regions are configured in Settings and can be customized per business needs
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Multiple regions can service the same state; postcode matching provides specificity
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Remote surcharge only applies when postcode matches a configured prefix
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                If no region matches, the default region is used as fallback
              </span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">Rule</Badge>
              <span className="text-muted-foreground">
                Shipping cost is added to the subtotal before tax calculation
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

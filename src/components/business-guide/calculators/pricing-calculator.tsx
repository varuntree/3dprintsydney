"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { MaterialDTO } from "@/server/services/materials";

interface PricingCalculatorProps {
  materials: MaterialDTO[];
  hourlyRate: number;
  setupFee: number;
  minimumPrice: number;
}

export function PricingCalculator({
  materials,
  hourlyRate,
  setupFee,
  minimumPrice,
}: PricingCalculatorProps) {
  const [grams, setGrams] = useState(80);
  const [timeSec, setTimeSec] = useState(3600);
  const [quantity, setQuantity] = useState(1);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");

  // Select first material by default
  useEffect(() => {
    if (materials.length > 0 && !selectedMaterialId) {
      setSelectedMaterialId(materials[0].id.toString());
    }
  }, [materials, selectedMaterialId]);

  const selectedMaterial = materials.find(
    (m) => m.id.toString() === selectedMaterialId
  );
  const costPerGram = selectedMaterial?.costPerGram || 0;

  // Calculate pricing (matches priceQuickOrderItem logic)
  const hours = timeSec / 3600;
  const materialCost = grams * costPerGram;
  const timeCost = hours * hourlyRate;
  const basePrice = materialCost + timeCost + setupFee;
  const unitPrice = Math.max(minimumPrice, basePrice);
  const total = unitPrice * quantity;

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg">Interactive Pricing Calculator</CardTitle>
        <CardDescription>
          Adjust values to see how the final price is calculated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
              <SelectTrigger id="material">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((mat) => (
                  <SelectItem key={mat.id} value={mat.id.toString()}>
                    {mat.name} {mat.color && `(${mat.color})`} - {formatCurrency(mat.costPerGram)}/g
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grams">Material Weight (grams)</Label>
            <Input
              id="grams"
              type="number"
              min="1"
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Print Time (seconds)</Label>
            <Input
              id="time"
              type="number"
              min="60"
              step="60"
              value={timeSec}
              onChange={(e) => setTimeSec(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">{formatTime(timeSec)}</p>
          </div>

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
        </div>

        <Separator />

        {/* Calculation Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Calculation Breakdown</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material Cost</span>
              <span className="font-mono">
                {grams} g × {formatCurrency(costPerGram)}/g = {formatCurrency(materialCost)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Cost</span>
              <span className="font-mono">
                {hours.toFixed(2)} h × {formatCurrency(hourlyRate)}/h = {formatCurrency(timeCost)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Setup Fee</span>
              <span className="font-mono">{formatCurrency(setupFee)}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Price</span>
              <span className="font-mono">{formatCurrency(basePrice)}</span>
            </div>

            {basePrice < minimumPrice && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Minimum Price Applied</span>
                <Badge variant="secondary">+{formatCurrency(minimumPrice - basePrice)}</Badge>
              </div>
            )}

            <div className="flex justify-between font-semibold">
              <span>Unit Price</span>
              <span className="font-mono">{formatCurrency(unitPrice)}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-mono">× {quantity}</span>
            </div>

            <div className="flex justify-between text-lg font-bold">
              <span>Total Price</span>
              <span className="font-mono">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Formula Display */}
        <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">FORMULA</p>
          <div className="font-mono text-xs space-y-1">
            <p>Unit Price = max(Minimum Price, Material Cost + Time Cost + Setup Fee)</p>
            <p>Total Price = Unit Price × Quantity</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

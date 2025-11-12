"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceFormValues } from "@/lib/types/invoice-form";
import { modellingComplexityValues } from "@/lib/types/modelling";

const normalizeNumber = (value: number) => (Number.isNaN(value) ? 0 : value);

export function ModellingLineItemForm({ index }: { index: number }) {
  const { watch, setValue } = useFormContext<InvoiceFormValues>();
  const line = watch((form) => form.lines[index]);
  if (!line) return null;

  const handleHourlyChange = (value: number) => {
    const normalized = normalizeNumber(value);
    setValue(`lines.${index}.modellingHourlyRate`, normalized, { shouldValidate: true });
    setValue(`lines.${index}.unitPrice`, normalized, { shouldValidate: true });
  };

  const handleHoursChange = (value: number) => {
    const normalized = normalizeNumber(value);
    setValue(`lines.${index}.modellingEstimatedHours`, normalized, { shouldValidate: true });
    setValue(`lines.${index}.quantity`, normalized, { shouldValidate: true });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm">
      <div>
        <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Brief</Label>
        <Textarea
          value={line.modellingBrief ?? ""}
          onChange={(event) => setValue(`lines.${index}.modellingBrief`, event.target.value)}
          rows={3}
          placeholder="Describe the modelling scope"
        />
      </div>
      <div>
        <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Complexity</Label>
        <Select
          value={line.modellingComplexity ?? modellingComplexityValues[0]}
          onValueChange={(value) =>
            setValue(`lines.${index}.modellingComplexity`, value as typeof modellingComplexityValues[number])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modellingComplexityValues.map((complexity) => (
              <SelectItem key={complexity} value={complexity}>
                {complexity.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Revisions</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={line.modellingRevisionCount ?? 0}
            onChange={(event) =>
              setValue(
                `lines.${index}.modellingRevisionCount`,
                normalizeNumber(event.target.valueAsNumber),
              )
            }
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Hourly rate</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={line.modellingHourlyRate ?? 0}
            onChange={(event) => handleHourlyChange(event.target.valueAsNumber)}
            placeholder="0.00"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Estimated hours</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={line.modellingEstimatedHours ?? 0}
            onChange={(event) => handleHoursChange(event.target.valueAsNumber)}
            placeholder="0.0"
          />
        </div>
      </div>
    </div>
  );
}

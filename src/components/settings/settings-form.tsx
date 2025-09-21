"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash } from "lucide-react";
import { mutateJson, getJson } from "@/lib/http";
import {
  calculatorConfigSchema,
  settingsInputSchema,
  shippingOptionSchema,
  type SettingsInput,
  jobCreationPolicyValues,
} from "@/lib/schemas/settings";

export type SettingsPayload = SettingsInput & {
  createdAt?: string;
  updatedAt?: string;
};

interface SettingsFormProps {
  initial: SettingsPayload;
}

const queryKey = ["settings"] as const;
const resolver: Resolver<SettingsInput> = zodResolver(
  settingsInputSchema,
) as Resolver<SettingsInput>;

function normalizeSettings(payload: SettingsPayload): SettingsInput {
  const shippingOptions = (payload.shippingOptions ?? []).map((option) => {
    const base = {
      code: option.code ?? "",
      label: option.label ?? "",
      amount:
        typeof option.amount === "number"
          ? option.amount
          : Number(option.amount ?? 0),
    };
    const parsed = shippingOptionSchema.safeParse(base);
    if (parsed.success) {
      return parsed.data;
    }
    return {
      code: base.code,
      label: base.label,
      amount: base.amount,
    } as SettingsInput["shippingOptions"][number];
  });

  const calculator = calculatorConfigSchema.parse(
    payload.calculatorConfig ?? {},
  );

  const jobPolicy = jobCreationPolicyValues.includes(
    payload.jobCreationPolicy as SettingsInput["jobCreationPolicy"],
  )
    ? (payload.jobCreationPolicy as SettingsInput["jobCreationPolicy"])
    : jobCreationPolicyValues[0];

  return {
    businessName: payload.businessName ?? "",
    businessEmail: payload.businessEmail ?? "",
    businessPhone: payload.businessPhone ?? "",
    businessAddress: payload.businessAddress ?? "",
    abn: payload.abn ?? "",
    taxRate: payload.taxRate ?? 10,
    numberingQuotePrefix: payload.numberingQuotePrefix ?? "QT-",
    numberingInvoicePrefix: payload.numberingInvoicePrefix ?? "INV-",
    defaultPaymentTerms: payload.defaultPaymentTerms ?? "Due on receipt",
    bankDetails: payload.bankDetails ?? "",
    jobCreationPolicy: jobPolicy,
    shippingOptions,
    calculatorConfig: calculator,
    defaultCurrency: payload.defaultCurrency ?? "AUD",
    stripeSecretKey: payload.stripeSecretKey ?? "",
    stripePublishableKey: payload.stripePublishableKey ?? "",
    stripeWebhookSecret: payload.stripeWebhookSecret ?? "",
    autoDetachJobOnComplete: payload.autoDetachJobOnComplete ?? true,
    autoArchiveCompletedJobsAfterDays:
      payload.autoArchiveCompletedJobsAfterDays ?? 7,
    preventAssignToOffline: payload.preventAssignToOffline ?? true,
    preventAssignToMaintenance: payload.preventAssignToMaintenance ?? true,
    maxActivePrintingPerPrinter: payload.maxActivePrintingPerPrinter ?? 1,
    overdueDays: payload.overdueDays ?? 0,
    reminderCadenceDays: payload.reminderCadenceDays ?? 7,
    enableEmailSend: payload.enableEmailSend ?? false,
  };
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const queryClient = useQueryClient();
  const defaults = normalizeSettings(initial);

  const form = useForm<SettingsInput>({
    resolver,
    defaultValues: defaults,
    mode: "onBlur",
  });

  const { data } = useQuery({
    queryKey,
    queryFn: () => getJson<SettingsPayload>("/api/settings"),
    initialData: initial,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (data) {
      form.reset(normalizeSettings(data));
    }
  }, [data, form]);

  const shippingArray = useFieldArray({
    control: form.control,
    name: "shippingOptions",
  });

  const policyOptions = useMemo(
    () => [
      { value: jobCreationPolicyValues[0], label: "When invoice is paid" },
      { value: jobCreationPolicyValues[1], label: "When invoice is created" },
    ],
    [],
  );

  const mutation = useMutation({
    mutationFn: async (values: SettingsInput) =>
      mutateJson<SettingsPayload>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKey, payload);
      toast.success("Settings saved");
      form.reset(normalizeSettings(payload));
      const hasStripe = Boolean(
        (payload.stripePublishableKey ?? "").trim() &&
          (payload.stripeSecretKey ?? "").trim(),
      );
      if (!hasStripe) {
        toast.info(
          "Stripe checkout remains disabled. Add publishable and secret keys in Integrations to enable it.",
        );
      }
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    },
  });

  const onSubmit = form.handleSubmit((values: SettingsInput) => {
    mutation.mutate(values);
  });

  const tabs = [
    { value: "identity", label: "Business" },
    { value: "numbering", label: "Tax & Numbering" },
    { value: "payments", label: "Payments" },
    { value: "shipping", label: "Shipping" },
    { value: "calculator", label: "Calculator" },
    { value: "jobs", label: "Jobs" },
    { value: "integrations", label: "Integrations" },
  ] as const;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Tabs defaultValue="identity" className="space-y-4">
          <TabsList className="bg-white/80 backdrop-blur">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="identity" className="focus-visible:outline-none">
            <SettingsCard
              title="Business identity"
              description="Appears on quotes, invoices, and the dashboard."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business name</FormLabel>
                      <FormControl>
                        <Input placeholder="3D Print Sydney" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="abn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ABN</FormLabel>
                      <FormControl>
                        <Input placeholder="00 000 000 000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="businessEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="hello@3dprintsydney.local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+61" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Street, City, State"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsCard>
          </TabsContent>

          <TabsContent value="numbering">
            <SettingsCard
              title="Tax & numbering"
              description="Control numbering prefixes and default GST rate."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default tax (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberingQuotePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote prefix</FormLabel>
                      <FormControl>
                        <Input placeholder="QT-" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberingInvoicePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice prefix</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="defaultPaymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default payment terms</FormLabel>
                    <FormControl>
                      <Input placeholder="Due on receipt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsCard>
          </TabsContent>

          <TabsContent value="payments">
            <SettingsCard
              title="Payments"
              description="Bank transfer details and payment defaults."
            >
              <FormField
                control={form.control}
                name="bankDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank transfer instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="BSB, Account number, Reference notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsCard>
          </TabsContent>

          <TabsContent value="shipping">
            <SettingsCard
              title="Shipping"
              description="Configure shipping options shown on quotes and invoices."
            >
              <div className="space-y-3">
                {shippingArray.fields.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No shipping options yet. Add your first option.
                  </p>
                ) : null}
                {shippingArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-xl border border-zinc-200/70 bg-white/80 p-4 backdrop-blur-sm md:grid-cols-[1fr_minmax(120px,160px)_minmax(100px,120px)_auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`shippingOptions.${index}.label` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                            Label
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Express Courier" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingOptions.${index}.code` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                            Code
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="express" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingOptions.${index}.amount` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                            Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => shippingArray.remove(index)}
                        className="text-zinc-400 hover:text-red-500"
                        aria-label="Remove shipping option"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  shippingArray.append({
                    code: "",
                    label: "",
                    amount: 0,
                  } as SettingsInput["shippingOptions"][number])
                }
                className="mt-4 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add option
              </Button>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="calculator">
            <SettingsCard
              title="3D printing calculator"
              description="Defaults for hour, material, and quality multipliers."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="calculatorConfig.hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly rate ($/hr)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calculatorConfig.setupFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup fee ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calculatorConfig.minimumPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator className="my-6" />
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="calculatorConfig.qualityMultipliers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quality multipliers</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder='{"draft":0.8,"standard":1,"fine":1.2}'
                          value={JSON.stringify(field.value, null, 2)}
                          onChange={(event) => {
                            try {
                              const parsed = JSON.parse(event.target.value);
                              calculatorConfigSchema.shape.qualityMultipliers.parse(
                                parsed,
                              );
                              field.onChange(parsed);
                            } catch {
                              // ignore until valid JSON
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        JSON object where keys are labels and values are
                        multipliers.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calculatorConfig.infillMultipliers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Infill multipliers</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder='{"low":0.9,"medium":1,"high":1.2}'
                          value={JSON.stringify(field.value, null, 2)}
                          onChange={(event) => {
                            try {
                              const parsed = JSON.parse(event.target.value);
                              calculatorConfigSchema.shape.infillMultipliers.parse(
                                parsed,
                              );
                              field.onChange(parsed);
                            } catch {
                              // ignore until valid JSON
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        JSON object for infill percentages and multipliers.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="jobs">
            <SettingsCard
              title="Job automation"
              description="Control when jobs are created from invoices."
            >
              <FormField
                control={form.control}
                name="jobCreationPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job creation policy</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {policyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Card className="mt-4 border border-zinc-200/60 bg-white/70 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-zinc-900">
                    Policy preview
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Workflow impacts for job automation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                    {policyOptions.map((option) => (
                      <Badge
                        key={option.value}
                        variant={
                          form.watch("jobCreationPolicy") === option.value
                            ? "default"
                            : "outline"
                        }
                        className="border border-zinc-300/60 bg-white/60 text-zinc-600"
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Separator className="my-6" />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="autoDetachJobOnComplete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-detach on completion</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormDescription>
                        Remove printer assignment when a job is marked completed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoArchiveCompletedJobsAfterDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-archive after (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        0 to archive immediately on completion.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxActivePrintingPerPrinter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max active prints per printer</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preventAssignToOffline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block assign to offline</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preventAssignToMaintenance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block assign to maintenance</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overdueDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice overdue after (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reminderCadenceDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder cadence (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enableEmailSend"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enable email sending</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="integrations">
            <SettingsCard
              title="Stripe"
              description="Optional keys for online payments."
            >
              <FormField
                control={form.control}
                name="stripePublishableKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publishable key</FormLabel>
                    <FormControl>
                      <Input placeholder="pk_live_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stripeSecretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="sk_live_..."
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stripeWebhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook secret</FormLabel>
                    <FormControl>
                      <Input placeholder="whsec_..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe/test", { method: "POST" });
                      const json = await res.json();
                      if (res.ok && json?.ok) toast.success("Stripe keys look OK");
                      else toast.error(json?.error?.message ?? "Stripe test failed");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Stripe test failed");
                    }
                  }}
                >
                  Test Stripe
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/maintenance/run", { method: "POST" });
                      if (res.ok) toast.success("Maintenance tasks executed");
                      else {
                        const j = await res.json().catch(() => ({}));
                        toast.error(j?.error?.message ?? "Maintenance failed");
                      }
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Maintenance failed");
                    }
                  }}
                >
                  Run Maintenance Now
                </Button>
              </div>
            </SettingsCard>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(normalizeSettings(initial))}
            disabled={mutation.isPending}
          >
            Reset
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface SettingsCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-semibold text-zinc-900">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-zinc-500">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-zinc-600">
        {children}
      </CardContent>
    </Card>
  );
}

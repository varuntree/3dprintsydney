"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { EmptyState } from "@/components/ui/empty-state";
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
import { getUserMessage } from "@/lib/errors/user-messages";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { browserLogger } from "@/lib/logging/browser-logger";
import type { LegacyUser } from "@/lib/types/user";
import {
  calculatorConfigSchema,
  settingsInputSchema,
  shippingRegionSchema,
  paymentTermSchema,
  DEFAULT_PAYMENT_TERMS,
  type SettingsInput,
  jobCreationPolicyValues,
} from "@/lib/schemas/settings";

export type SettingsPayload = SettingsInput & {
  createdAt?: string;
  updatedAt?: string;
};

interface SettingsFormProps {
  initial: SettingsPayload;
  user: LegacyUser;
}

const queryKey = ["settings"] as const;
const resolver: Resolver<SettingsInput> = zodResolver(
  settingsInputSchema,
) as Resolver<SettingsInput>;

function normalizeSettings(payload: SettingsPayload): SettingsInput {
  const fallbackShippingRegions: SettingsInput["shippingRegions"] = [
    {
      code: "sydney_metro",
      label: "Sydney Metro",
      states: ["NSW"],
      baseAmount: 12.5,
      remoteSurcharge: 0,
    },
    {
      code: "regional",
      label: "Regional Australia",
      states: ["NSW", "VIC", "QLD", "SA", "WA", "NT", "TAS", "ACT"],
      baseAmount: 25,
      remoteSurcharge: 0,
    },
    {
      code: "remote",
      label: "Remote & Islands",
      states: ["TAS", "WA", "NT"],
      baseAmount: 45,
      remoteSurcharge: 15,
    },
  ];

  const shippingRegionsInput = (payload.shippingRegions ?? []).map(
    (region, index) => {
      const rawStates = region.states as unknown;
      const base = {
        code: region.code ?? "",
        label: region.label ?? "",
        states: Array.isArray(rawStates)
          ? rawStates.map((state) => String(state))
          : typeof rawStates === "string"
            ? rawStates
                .split(",")
                .map((state) => state.trim())
                .filter(Boolean)
            : [],
        baseAmount:
          typeof region.baseAmount === "number"
            ? region.baseAmount
            : Number(region.baseAmount ?? 0),
        remoteSurcharge:
          region.remoteSurcharge === undefined || region.remoteSurcharge === null
            ? undefined
            : typeof region.remoteSurcharge === "number"
              ? region.remoteSurcharge
              : Number(region.remoteSurcharge),
        postcodePrefixes: Array.isArray(region.postcodePrefixes)
          ? region.postcodePrefixes.map((code) => String(code))
          : undefined,
      };
      const parsed = shippingRegionSchema.safeParse(base);
      if (parsed.success) {
        return parsed.data;
      }
      browserLogger.warn({
        scope: "browser.settings.invalid-region",
        message: "Invalid shipping region recovered in settings payload",
        data: {
          index,
          code: region.code,
          label: region.label,
          issues: parsed.error.issues,
        },
      });
      return {
        code: base.code,
        label: base.label,
        states: base.states,
        baseAmount: base.baseAmount,
        remoteSurcharge: base.remoteSurcharge,
        postcodePrefixes: base.postcodePrefixes,
      } as SettingsInput["shippingRegions"][number];
    },
  );

  const shippingRegions =
    shippingRegionsInput.length > 0
      ? shippingRegionsInput
      : fallbackShippingRegions;

  const paymentTermsInput = (payload.paymentTerms ?? DEFAULT_PAYMENT_TERMS).map(
    (term, index) => {
      const base = {
        code: term.code ?? "",
        label: term.label ?? "",
        days:
          typeof term.days === "number"
            ? term.days
            : Number(term.days ?? 0),
      };
      const parsed = paymentTermSchema.safeParse(base);
      if (parsed.success) {
        return parsed.data;
      }
      browserLogger.warn({
        scope: "browser.settings.invalid-payment-term",
        message: "Invalid payment term recovered in settings payload",
        data: {
          index,
          issues: parsed.error.issues,
        },
      });
      return base as SettingsInput["paymentTerms"][number];
    },
  );

  const paymentTerms =
    paymentTermsInput.length > 0
      ? paymentTermsInput
      : DEFAULT_PAYMENT_TERMS.map((term) => ({ ...term }));

  const calculator = calculatorConfigSchema.parse(
    payload.calculatorConfig ?? {},
  );

  const jobPolicy = jobCreationPolicyValues.includes(
    payload.jobCreationPolicy as SettingsInput["jobCreationPolicy"],
  )
    ? (payload.jobCreationPolicy as SettingsInput["jobCreationPolicy"])
    : jobCreationPolicyValues[0];

  const defaultPaymentTermCode = paymentTerms.some(
    (term) => term.code === (payload.defaultPaymentTerms ?? ""),
  )
    ? payload.defaultPaymentTerms ?? paymentTerms[0]?.code ?? ""
    : paymentTerms[0]?.code ?? "";

  const defaultShippingRegionCode = shippingRegions.some(
    (region) => region.code === (payload.defaultShippingRegion ?? ""),
  )
    ? payload.defaultShippingRegion ?? shippingRegions[0]?.code ?? "sydney_metro"
    : shippingRegions[0]?.code ?? "sydney_metro";

  return {
    businessName: payload.businessName ?? "",
    businessEmail: payload.businessEmail ?? "",
    businessPhone: payload.businessPhone ?? "",
    businessAddress: payload.businessAddress ?? "",
    abn: payload.abn ?? "",
    taxRate: payload.taxRate ?? 10,
    numberingQuotePrefix: payload.numberingQuotePrefix ?? "QT-",
    numberingInvoicePrefix: payload.numberingInvoicePrefix ?? "INV-",
    defaultPaymentTerms: defaultPaymentTermCode,
    paymentTerms,
    bankDetails: payload.bankDetails ?? "",
    jobCreationPolicy: jobPolicy,
    shippingRegions,
    defaultShippingRegion: defaultShippingRegionCode,
    calculatorConfig: calculator,
    defaultCurrency: payload.defaultCurrency ?? "AUD",
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


export function SettingsForm({ initial, user }: SettingsFormProps) {
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

  const shippingRegionsArray = useFieldArray({
    control: form.control,
    name: "shippingRegions",
  });

  const paymentTermsArray = useFieldArray({
    control: form.control,
    name: "paymentTerms",
  });

  const paymentTerms = form.watch("paymentTerms");
  const shippingRegions = form.watch("shippingRegions");

  useEffect(() => {
    const regions = form.getValues("shippingRegions");
    const defaultRegion = form.getValues("defaultShippingRegion");
    if (!regions || regions.length === 0) {
      if (defaultRegion) {
        form.setValue("defaultShippingRegion", "");
      }
      return;
    }
    if (!regions.some((region) => region.code === defaultRegion)) {
      form.setValue("defaultShippingRegion", regions[0]?.code ?? "");
    }
  }, [form, shippingRegions]);

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
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const onSubmit = form.handleSubmit((values: SettingsInput) => {
    mutation.mutate(values);
  });

  const tabs = [
    { value: "profile", label: "Profile" },
    { value: "identity", label: "Business" },
    { value: "numbering", label: "Tax & Numbering" },
    { value: "payments", label: "Payments" },
    { value: "shipping", label: "Shipping" },
    { value: "calculator", label: "Calculator" },
    { value: "jobs", label: "Jobs" },
  ] as const;

  const roleLabel = user.role === "ADMIN" ? "Admin" : user.role === "CLIENT" ? "Client" : user.role;

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-3xl border border-border bg-surface-elevated/80 p-4 shadow-sm shadow-black/5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure business details, payment terms, and system preferences.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm shadow-black/5 sm:min-w-[240px]">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
              Signed in as
            </p>
            <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
            <Badge
              variant="outline"
              className="w-fit rounded-full border-border/60 bg-surface-overlay px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
            >
              {roleLabel}
            </Badge>
          </div>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-7 pb-28">
          {mutation.isPending ? (
            <InlineLoader label="Saving settings…" className="text-sm" />
          ) : null}
          <Tabs defaultValue="profile" className="space-y-5">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

          <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
            <SettingsCard
              title="Account profile"
              description="View your account details and manage your password."
            >
              <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm shadow-black/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This address receives all administrative notifications.
                  </p>
                </div>
                <ChangePasswordForm email={user.email} />
              </div>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="identity" className="space-y-6 focus-visible:outline-none">
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

          <TabsContent value="numbering" className="space-y-6 focus-visible:outline-none">
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentTerms.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Add payment terms below
                          </div>
                        ) : (
                          paymentTerms.map((term, index) => (
                            <SelectItem
                              key={`${term.code}-${index}`}
                              value={term.code}
                            >
                              {term.label}{' '}
                              {term.days === 0
                                ? '(due immediately)'
                                : `(${term.days} days)`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Applied to new clients and invoices unless overridden.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsCard>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 focus-visible:outline-none">
            <SettingsCard
              title="Payments"
              description="Manage payment terms and bank transfer details used across documents."
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Payment terms</h3>
                      <p className="text-sm text-muted-foreground">Define the options available when creating clients. Codes should be unique.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() =>
                        paymentTermsArray.append({
                          code: "",
                          label: "",
                          days: 0,
                        } as SettingsInput["paymentTerms"][number])
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" /> Add term
                    </Button>
                  </div>

                  {paymentTermsArray.fields.length === 0 ? (
                    <EmptyState
                      title="No payment terms yet"
                      description="Add payment terms so clients, quotes, and invoices pick up the correct defaults."
                      className="rounded-2xl border-border/60 bg-card/80 shadow-sm shadow-black/5"
                    />
                  ) : (
                    <div className="space-y-3">
                      {paymentTermsArray.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-3 rounded-2xl border border-border/60 bg-card/80 shadow-sm shadow-black/5 p-4 md:grid-cols-[minmax(160px,1fr)_minmax(120px,160px)_minmax(120px,160px)_auto]"
                        >
                          <FormField
                            control={form.control}
                            name={`paymentTerms.${index}.label` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Label</FormLabel>
                                <FormControl>
                                  <Input placeholder="COD" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`paymentTerms.${index}.code` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="COD" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`paymentTerms.${index}.days` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Days</FormLabel>
                                <FormControl>
                                  <Input type="number" min={0} step={1} {...field} />
                                </FormControl>
                                <FormDescription>0 for COD</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex items-end justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={mutation.isPending}
                              onClick={() => paymentTermsArray.remove(index)}
                              className="text-muted-foreground/80 hover:text-red-500 rounded-full"
                              aria-label="Remove payment term"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

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
              </div>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-6 focus-visible:outline-none">
            <SettingsCard
              title="Shipping"
              description="Configure shipping regions for delivery estimates across quick orders, quotes, and invoices."
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultShippingRegion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default shipping region</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={(shippingRegions ?? []).length === 0 || mutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(shippingRegions ?? []).map((region) => (
                            <SelectItem key={region.code} value={region.code}>
                              {region.label} ({region.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Used when a job&apos;s location does not match a specific region.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {shippingRegionsArray.fields.length === 0 ? (
                  <EmptyState
                    title="No shipping regions"
                    description="Add at least one region so shipping costs can be estimated."
                    className="rounded-2xl border-border/60 bg-card/80 shadow-sm shadow-black/5"
                  />
                ) : null}

                {shippingRegionsArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-2xl border border-border/60 bg-card/80 shadow-sm shadow-black/5 p-4 md:grid-cols-[minmax(160px,1fr)_minmax(140px,200px)_minmax(220px,1fr)_minmax(120px,140px)_minmax(120px,140px)_minmax(200px,1fr)_auto] md:items-end"
                  >
                    <FormField
                      control={form.control}
                      name={`shippingRegions.${index}.label` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            Label
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Sydney Metro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingRegions.${index}.code` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            Code
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="sydney_metro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingRegions.${index}.states` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            States / Territories
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="NSW, ACT"
                              value={Array.isArray(field.value) ? field.value.join(", ") : ""}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value
                                    .split(",")
                                    .map((state) => state.trim())
                                    .filter((state) => state.length > 0),
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>Comma separated abbreviations (e.g. NSW, ACT).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingRegions.${index}.baseAmount` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            Base amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              value={field.value ?? 0}
                              onChange={(event) => field.onChange(Number(event.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingRegions.${index}.remoteSurcharge` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            Remote add-on
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              value={field.value ?? ""}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>Optional surcharge applied to remote deliveries.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shippingRegions.${index}.postcodePrefixes` as const}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                            Postcode prefixes
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="2000, 2001"
                              value={Array.isArray(field.value) ? field.value.join(", ") : ""}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value
                                    .split(",")
                                    .map((code) => code.trim())
                                    .filter((code) => code.length > 0),
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>Optional comma separated prefixes for granular routing.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={mutation.isPending}
                        onClick={() => shippingRegionsArray.remove(index)}
                        className="text-muted-foreground/80 hover:text-red-500 rounded-full"
                        aria-label="Remove shipping region"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() =>
                      shippingRegionsArray.append({
                        code: "",
                        label: "",
                        states: [],
                        baseAmount: 0,
                        remoteSurcharge: 0,
                        postcodePrefixes: [],
                      } as SettingsInput["shippingRegions"][number])
                    }
                    className="w-full gap-2 rounded-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" /> Add shipping region
                  </Button>
                </div>
              </div>
            </SettingsCard>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6 focus-visible:outline-none">
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

          <TabsContent value="jobs" className="space-y-6 focus-visible:outline-none">
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
                    <FormDescription>
                      Choose when jobs are pushed to the production board. Use
                      <strong className="mx-1 text-foreground">When invoice is created</strong>
                      to queue work as soon as terms are agreed, or
                      <strong className="mx-1 text-foreground">When invoice is paid</strong>
                      to hold jobs until payment clears.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Card className="mt-4 rounded-2xl border border-border/60 bg-card/80 shadow-sm shadow-black/5">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Policy preview
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Workflow impacts for job automation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {policyOptions.map((option) => (
                      <Badge
                        key={option.value}
                        variant={
                          form.watch("jobCreationPolicy") === option.value
                            ? "default"
                            : "outline"
                        }
                        className="border border-border bg-surface-overlay text-muted-foreground rounded-full"
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
              <div className="mt-6 flex justify-end">
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
                      toast.error(getUserMessage(e));
                    }
                  }}
                  className="rounded-full"
                >
                  Run Maintenance Now
                </Button>
              </div>
            </SettingsCard>
          </TabsContent>
          </Tabs>

          <div className="sticky bottom-4 z-30 mt-6 flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-lg shadow-black/15 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Account configuration</p>
              <p className="hidden text-[11px] sm:block">
                Changes apply to new invoices, quotes, and client flows immediately after saving.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset(normalizeSettings(initial))}
                disabled={mutation.isPending}
                className="gap-2 rounded-full"
              >
                Reset
              </Button>
              <LoadingButton
                type="submit"
                loading={mutation.isPending}
                loadingText="Saving settings…"
                className="gap-2 rounded-full"
              >
                Save settings
              </LoadingButton>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface SettingsCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-overlay shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}

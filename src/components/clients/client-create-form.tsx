"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { InlineLoader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { usePaymentTerms } from "@/hooks/use-payment-terms";
import { mutateJson } from "@/lib/http";
import { getUserMessage } from "@/lib/errors/user-messages";
import type { ClientSummaryRecord } from "./clients-view";
import {
  clientFormResolver,
  defaultClientFormValues,
  PAYMENT_TERMS_INHERIT_VALUE,
  type ClientFormValues,
} from "./client-form-shared";

export function ClientCreateForm() {
  const router = useRouter();
  const form = useForm<ClientFormValues>({
    resolver: clientFormResolver,
    defaultValues: defaultClientFormValues(),
  });
  const {
    terms: paymentTermOptions,
    defaultTermCode,
    isLoading: paymentTermsLoading,
    notificationsEnabledDefault,
  } = usePaymentTerms();
  const hasInitialisedDefaults = useRef(false);

  useEffect(() => {
    if (hasInitialisedDefaults.current) {
      return;
    }
    if (paymentTermsLoading) {
      return;
    }
    form.reset({
      ...defaultClientFormValues(),
      paymentTerms: defaultTermCode,
      notifyOnJobStatus: notificationsEnabledDefault,
    });
    hasInitialisedDefaults.current = true;
  }, [defaultTermCode, notificationsEnabledDefault, paymentTermsLoading, form]);

  const mutation = useMutation({
    mutationFn: (values: ClientFormValues) =>
      mutateJson<ClientSummaryRecord>("/api/clients", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (client) => {
      toast.success("Client created");
      router.replace(`/clients/${client.id}`);
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-6 pb-24"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/80">
              <CardHeader className="space-y-1">
                <CardTitle>Client information</CardTitle>
                <CardDescription>Capture the basics about this new relationship.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Company" {...field} />
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
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80">
              <CardHeader className="space-y-1">
                <CardTitle>Contact details</CardTitle>
                <CardDescription>Let us know how to reach this client.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
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
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Street, City, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80">
              <CardHeader className="space-y-1">
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Set payment defaults and capture any internal notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment terms</FormLabel>
                      <Select
                        value={
                          field.value && field.value.trim().length > 0
                            ? field.value
                            : PAYMENT_TERMS_INHERIT_VALUE
                        }
                        onValueChange={(value) =>
                          field.onChange(value === PAYMENT_TERMS_INHERIT_VALUE ? "" : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={PAYMENT_TERMS_INHERIT_VALUE}>
                            Use settings default
                          </SelectItem>
                          {paymentTermOptions.map((term) => (
                            <SelectItem key={term.code} value={term.code}>
                              {term.label}{" "}
                              {term.days === 0 ? "(due immediately)" : `(${term.days} days)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {paymentTermsLoading ? (
                        <InlineLoader label="Loading payment terms…" className="text-xs" />
                      ) : null}
                      <FormDescription>
                        Manage options in Settings → Payments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyOnJobStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium">Job status emails</FormLabel>
                        <FormDescription>
                          Send automated production updates when enabled in global settings.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          disabled={mutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal notes</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Project background, preferences" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="border-border/70 bg-card/80">
              <CardHeader className="space-y-1">
                <CardTitle>Summary</CardTitle>
                <CardDescription>Review the details before creating the client.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>All required information is captured on the left. You can always update these details later from the client profile.</p>
                <p className="rounded-xl border border-dashed border-border/60 bg-muted/40 p-3 text-xs">
                  Tip: enable job status emails to keep customers updated without manual follow-up.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-[960px] items-center justify-between gap-4">
            <div className="hidden text-sm text-muted-foreground sm:block">
              {mutation.isPending ? "Saving new client…" : "All details autosave once created."}
            </div>
            <div className="flex flex-1 justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={mutation.isPending}
                className="rounded-full"
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                loading={mutation.isPending}
                loadingText="Creating client…"
                className="rounded-full"
              >
                Create client
              </LoadingButton>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

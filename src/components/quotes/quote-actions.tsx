"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quoteStatusSchema } from "@/lib/schemas/quotes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "sonner";
import { mutateJson } from "@/lib/http";
import { Textarea } from "@/components/ui/textarea";

interface QuoteActionsProps {
  quoteId: number;
  currentStatus: string;
}

type QuoteStatusForm = {
  status: "DRAFT" | "PENDING" | "ACCEPTED" | "DECLINED" | "CONVERTED";
};

export function QuoteActions({ quoteId, currentStatus }: QuoteActionsProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<QuoteStatusForm>({
    resolver: zodResolver(quoteStatusSchema),
    defaultValues: { status: currentStatus as QuoteStatusForm["status"] },
  });

  const statusMutation = useMutation({
    mutationFn: (values: QuoteStatusForm) =>
      mutateJson(`/api/quotes/${quoteId}/status`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      toast.success("Quote status updated");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    },
  });

  const convertMutation = useMutation<{ id: number }, Error, void>({
    mutationFn: () =>
      mutateJson<{ id: number }>(`/api/quotes/${quoteId}/convert`, {
        method: "POST",
      }),
    onSuccess: (invoice) => {
      toast.success("Quote converted to invoice");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      router.push(`/invoices/${invoice.id}`);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to convert quote",
      );
    },
  });

  const duplicateMutation = useMutation<{ id: number }, Error, void>({
    mutationFn: () =>
      mutateJson<{ id: number }>(`/api/quotes/${quoteId}/duplicate`, {
        method: "POST",
      }),
    onSuccess: (quote) => {
      toast.success("Quote duplicated");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      router.push(`/quotes/${quote.id}`);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate quote",
      );
    },
  });

  const [downloading, setDownloading] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const sendMutation = useMutation({
    mutationFn: () => mutateJson(`/api/quotes/${quoteId}/send`, { method: "POST" }),
    onSuccess: () => toast.success("Quote sent"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send quote"),
  });
  const acceptMutation = useMutation({
    mutationFn: () => mutateJson(`/api/quotes/${quoteId}/accept`, { method: "POST", body: JSON.stringify({ note: decisionNote || undefined }) }),
    onSuccess: () => { toast.success("Quote accepted"); setDecisionNote(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to accept quote"),
  });
  const declineMutation = useMutation({
    mutationFn: () => mutateJson(`/api/quotes/${quoteId}/decline`, { method: "POST", body: JSON.stringify({ note: decisionNote || undefined }) }),
    onSuccess: () => { toast.success("Quote declined"); setDecisionNote(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to decline quote"),
  });

  async function downloadPdf() {
    try {
      setDownloading(true);
      const response = await fetch(`/api/quotes/${quoteId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quote-${quoteId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download PDF",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-zinc-900">
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={form.handleSubmit((values) =>
              statusMutation.mutate(values),
            )}
          >
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        [
                          "DRAFT",
                          "PENDING",
                          "ACCEPTED",
                          "DECLINED",
                          "CONVERTED",
                        ] as const
                      ).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={statusMutation.isPending}>
              {statusMutation.isPending ? "Updating…" : "Update status"}
            </Button>
          </form>
        </Form>

        <div className="flex flex-wrap gap-2">
          <Button variant="default" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? "Sending…" : "Send"}
          </Button>
          <Textarea
            rows={2}
            placeholder="Decision note (optional)"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
            {acceptMutation.isPending ? "Accepting…" : "Accept"}
          </Button>
          <Button variant="outline" onClick={() => declineMutation.mutate()} disabled={declineMutation.isPending}>
            {declineMutation.isPending ? "Declining…" : "Decline"}
          </Button>
          <Button
            variant="outline"
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
          >
            {convertMutation.isPending ? "Converting…" : "Convert to invoice"}
          </Button>
          <Button
            variant="outline"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
          <Button
            variant="outline"
            onClick={downloadPdf}
            disabled={downloading}
          >
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

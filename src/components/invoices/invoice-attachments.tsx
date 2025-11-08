"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUserMessage } from "@/lib/errors/user-messages";

export type InvoiceAttachmentRecord = {
  id: number;
  filename: string;
  filetype: string | null;
  size: number;
  uploadedAt: string;
};

interface InvoiceAttachmentsProps {
  invoiceId: number;
  attachments: InvoiceAttachmentRecord[];
}

export function InvoiceAttachments({
  invoiceId,
  attachments,
}: InvoiceAttachmentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/invoices/${invoiceId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Attachment uploaded");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(
        `/api/invoices/${invoiceId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Delete failed");
      }
    },
    onSuccess: () => {
      toast.success("Attachment removed");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: (error: unknown) => {
      toast.error(getUserMessage(error));
    },
  });

  function triggerUpload() {
    fileInputRef.current?.click();
  }

  return (
    <Card className="border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-zinc-900">
          Attachments
        </CardTitle>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                uploadMutation.mutate(file);
              }
            }}
          />
          <Button
            variant="outline"
            onClick={triggerUpload}
            disabled={uploadMutation.isPending}
          >
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <p className="text-sm text-zinc-500">No attachments uploaded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((attachment) => (
                <TableRow key={attachment.id}>
                  <TableCell>
                    <a
                      href={`/api/attachments/${attachment.id}`}
                      className="text-zinc-900 underline"
                    >
                      {attachment.filename}
                    </a>
                  </TableCell>
                  <TableCell>{attachment.filetype ?? "Unknown"}</TableCell>
                  <TableCell className="text-right">
                    {formatFileSize(attachment.size)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className="text-red-500"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(attachment.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

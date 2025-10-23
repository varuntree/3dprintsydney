"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Search } from "lucide-react";
import type { ClientSummaryRecord } from "@/components/clients/clients-view";

interface ClientPickerDialogProps {
  clients: ClientSummaryRecord[];
  value?: number;
  onSelect: (id: number) => void;
  disabled?: boolean;
}

export function ClientPickerDialog({ clients, value, onSelect, disabled }: ClientPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aDate = new Date(a.createdAt ?? 0).getTime();
      const bDate = new Date(b.createdAt ?? 0).getTime();
      return bDate - aDate;
    });
  }, [clients]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter((client) =>
      [client.name, client.company, client.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [sorted, query]);

  const current = value ? clients.find((client) => client.id === value) ?? null : null;

  function handleSelect(id: number) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="justify-between"
          disabled={disabled}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <span className="truncate">{current ? current.name : "Select client"}</span>
            {current?.studentDiscountEligible ? (
              <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {current.studentDiscountRate}% off
              </span>
            ) : null}
          </span>
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Search by name, company, or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
            <ul className="divide-y divide-border">
              {filtered.map((client) => {
                const isActive = value === client.id;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-muted",
                        isActive && "bg-muted"
                      )}
                      onClick={() => handleSelect(client.id)}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">{client.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {[client.company, client.email].filter(Boolean).join(" • ") || "No contact info"}
                        </span>
                        {client.studentDiscountEligible ? (
                          <span className="mt-1 text-[11px] font-medium text-emerald-600">
                            {client.studentDiscountRate}% student discount
                          </span>
                        ) : null}
                      </span>
                      {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No clients match <span className="font-semibold">“{query}”</span>.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRow = {
  id: number;
  email: string;
  role: "ADMIN" | "CLIENT";
  clientId: number | null;
  createdAt: string;
  messageCount: number;
};

type ClientSummary = { id: number; name: string };

type InviteResponse = {
  id: number;
  email: string;
  role: "ADMIN" | "CLIENT";
  clientId: number | null;
  createdAt: string;
  temporaryPassword: string;
};

function InviteUserDialog({
  clients,
  onCreated,
}: {
  clients: ClientSummary[];
  onCreated: (user: InviteResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CLIENT">("CLIENT");
  const [clientId, setClientId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<InviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedClients = useMemo(
    () =>
      [...clients].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [clients],
  );

  const resetForm = () => {
    setEmail("");
    setRole("CLIENT");
    setClientId("");
    setResult(null);
    setError(null);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.temporaryPassword);
    toast.success("Temporary password copied to clipboard");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: {
        email: string;
        role: "ADMIN" | "CLIENT";
        clientId?: number;
      } = { email, role };
      if (role === "CLIENT" && clientId) {
        payload.clientId = Number(clientId);
      }
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error ?? "Failed to invite user");
        return;
      }
      setResult(json.data);
      onCreated(json.data);
      toast.success(`Invited ${json.data.email}`);
    } catch (err) {
      setError((err as Error).message ?? "Failed to invite user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a User</DialogTitle>
          <DialogDescription>
            Send a temporary password to a teammate. They&apos;ll be asked to change it on their first login.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: "ADMIN" | "CLIENT") => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "CLIENT" && (
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={clientId}
                onValueChange={setClientId}
                disabled={sortedClients.length === 0}
              >
                <SelectTrigger id="client" aria-invalid={role === "CLIENT" && !clientId ? true : undefined}>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {sortedClients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sortedClients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No clients found. Create a client first, then invite a user.
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">User invited successfully.</p>
              <p className="mt-2">Email: {result.email}</p>
              <p className="mt-2 font-semibold">Temporary password:</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-md bg-background px-2 py-1 text-sm">{result.temporaryPassword}</code>
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting || (role === "CLIENT" && !clientId)}>
              {isSubmitting ? "Inviting…" : "Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);

  useEffect(() => {
    const abort = new AbortController();

    const loadUsers = async () => {
      const response = await fetch("/api/admin/users", { signal: abort.signal });
      if (!response.ok) {
        router.replace("/login");
        return;
      }
      const { data } = await response.json();
      setUsers(data);
    };

    const loadClients = async () => {
      const response = await fetch("/api/admin/clients", { signal: abort.signal });
      if (!response.ok) return;
      const { data } = await response.json();
      setClients(data);
    };

    void loadUsers();
    void loadClients();
    return () => abort.abort();
  }, [router]);

  const handleCreated = (user: InviteResponse) => {
    setUsers((prev) => [
      {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        createdAt: user.createdAt,
        messageCount: 0,
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <InviteUserDialog clients={clients} onCreated={handleCreated} />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface-overlay">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="cursor-pointer" onClick={() => router.push(`/users/${u.id}`)}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.messageCount}</TableCell>
                <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type U = { id: number; email: string; role: "ADMIN" | "CLIENT"; clientId: number | null; createdAt: string; messageCount: number };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<U[]>([]);

  useEffect(() => {
    fetch("/api/admin/users").then(async (r) => {
      if (!r.ok) {
        router.replace("/login");
        return;
      }
      const { data } = await r.json();
      setUsers(data);
    });
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Users</h1>
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

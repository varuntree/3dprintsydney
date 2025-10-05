"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type UserInfo = { id: number; email: string; role: "ADMIN" | "CLIENT"; clientId: number | null };

export function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) return;
      const { data } = await r.json();
      if (!cancelled) setUser(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="p-4">
        <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>Sign in</Button>
      </div>
    );
  }

  const initial = (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.email}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{user.role}</p>
        </div>
      </div>
      <Separator className="my-3" />
      <Button variant="outline" className="w-full" onClick={logout}>Logout</Button>
    </div>
  );
}

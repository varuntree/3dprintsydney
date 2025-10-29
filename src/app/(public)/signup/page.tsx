"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        confirm,
        firstName,
        lastName,
        phone,
        isBusinessAccount,
        businessName: isBusinessAccount ? businessName : undefined,
        position: isBusinessAccount ? position : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(
        typeof j?.error === "string"
          ? j.error
          : typeof j?.error?.message === "string"
          ? j.error.message
          : "Signup failed",
      );
      return;
    }
    const { data } = await res.json();
    router.replace(data.role === "ADMIN" ? "/dashboard" : "/me");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border border-border bg-surface-overlay p-6">
      <div>
        <h1 className="text-lg font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">Sign up with email and password.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isBusinessAccount"
              checked={isBusinessAccount}
              onCheckedChange={(checked) => setIsBusinessAccount(checked === true)}
            />
            <Label htmlFor="isBusinessAccount" className="cursor-pointer font-normal">
              Registering as a business
            </Label>
          </div>

          {isBusinessAccount && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required={isBusinessAccount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Manager, Director"
                  required={isBusinessAccount}
                />
              </div>
            </div>
          )}
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <a className="text-primary underline" href="/login">Already have an account? Sign in</a>
      </div>
    </div>
  );
}

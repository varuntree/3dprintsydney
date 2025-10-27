"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ProfileData = {
  firstName: string;
  lastName: string;
  phone: string;
  company: string | null;
  position: string | null;
};

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    phone: "",
    company: null,
    position: null,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch("/api/client/profile");
      if (!res.ok) {
        toast.error("Failed to load profile");
        return;
      }
      const { data: profile } = await res.json();
      setData({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        company: profile.company || null,
        position: profile.position || null,
      });
    } catch (error) {
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          company: data.company || null,
          position: data.position || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to update profile" }));
        toast.error(errorData.error || "Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBusinessAccount = !!(data.company || data.position);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Personal Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName" className="text-xs">
              First Name
            </Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => setData({ ...data, firstName: e.target.value })}
              required
              className="h-9"
            />
          </div>

          <div>
            <Label htmlFor="lastName" className="text-xs">
              Last Name
            </Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => setData({ ...data, lastName: e.target.value })}
              required
              className="h-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="text-xs">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            required
            className="h-9"
          />
        </div>
      </div>

      {/* Business Details (if applicable) */}
      {isBusinessAccount && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-surface-muted/50 p-3">
          <h3 className="text-sm font-semibold text-foreground">Business Information</h3>

          <div>
            <Label htmlFor="company" className="text-xs">
              Company Name
            </Label>
            <Input
              id="company"
              value={data.company || ""}
              onChange={(e) => setData({ ...data, company: e.target.value || null })}
              className="h-9"
            />
          </div>

          <div>
            <Label htmlFor="position" className="text-xs">
              Position / Role
            </Label>
            <Input
              id="position"
              value={data.position || ""}
              onChange={(e) => setData({ ...data, position: e.target.value || null })}
              className="h-9"
            />
          </div>
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  );
}

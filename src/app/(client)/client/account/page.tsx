"use client";

import { ChangePasswordForm } from "@/components/account/change-password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { NotificationPreferences } from "@/components/account/notification-preferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientAccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.replace("/login");
          return;
        }
        return r.json();
      })
      .then((json) => {
        if (json?.data) {
          setUser({ email: json.data.email });
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!user) {
    return (
      <div className="container max-w-4xl space-y-6 py-6 sm:py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-6 py-6 sm:py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Manage your account, security, and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <NotificationPreferences />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="rounded-3xl border border-border bg-surface-overlay shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <ChangePasswordForm email={user.email} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

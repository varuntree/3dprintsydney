#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Usage: npm run create:admin -- <email> [password]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const password = passwordArg || randomBytes(12).toString("base64url").slice(0, 16);

async function main() {
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", emailArg)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check existing user:", existingError.message);
    process.exit(1);
  }

  if (existing) {
    console.error("User already exists:", emailArg);
    process.exit(1);
  }

  const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
    email: emailArg,
    password,
    email_confirm: true,
  });

  if (createError || !adminUser?.user) {
    console.error("Failed to create auth user:", createError?.message ?? "Unknown error");
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("users").insert({
    auth_user_id: adminUser.user.id,
    email: emailArg,
    role: "ADMIN",
    client_id: null,
  });

  if (profileError) {
    console.error("Failed to insert user profile:", profileError.message);
    await supabase.auth.admin.deleteUser(adminUser.user.id).catch(() => undefined);
    process.exit(1);
  }

  console.log("Admin account created:");
  console.log("  Email:", emailArg);
  console.log("  Temporary password:", password);
}

main();

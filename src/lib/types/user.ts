export type LegacyUserRole = "ADMIN" | "CLIENT";

export type LegacyUser = {
  id: number;
  email: string;
  role: LegacyUserRole;
  clientId: number | null;
  name?: string | null;
  phone?: string | null;
};

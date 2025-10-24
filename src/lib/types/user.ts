export type LegacyUserRole = "ADMIN" | "CLIENT";

export type LegacyUser = {
  id: number;
  email: string;
  role: LegacyUserRole;
  clientId: number | null;
  name?: string | null;
  phone?: string | null;
  studentDiscountEligible?: boolean;
  studentDiscountRate?: number;
};

/**
 * User DTO for admin views
 */
export type UserDTO = {
  id: number;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  clientId: number | null;
  createdAt: string;
  messageCount?: number;
  studentDiscountEligible?: boolean;
  studentDiscountRate?: number;
};

/**
 * User creation input
 */
export type UserCreateInput = {
  email: string;
  role: 'ADMIN' | 'CLIENT';
  clientId?: number | null;
};

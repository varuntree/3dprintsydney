import type { ClientProjectStatus } from '@/lib/constants/client-project-status';

export type ClientProjectCounters = {
  pendingPrint: number;
  pendingPayment: number;
  completed: number;
  availableCredit: number;
};

export type ClientDashboardStats = {
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
  walletBalance: number;
  projectCounters: ClientProjectCounters;
};

export type ClientProjectSummary = {
  id: number;
  title: string;
  description: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  total: number;
  balanceDue: number;
  clientStatus: ClientProjectStatus;
  invoiceStatus: string;
  jobStatus: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
